#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import JSONC from "./vendor/jsonc-parser/lib/umd/main.js";
import { format } from "./vendor/prettier/standalone.mjs";
import babel from "./vendor/prettier/plugins/babel.mjs";
import estree from "./vendor/prettier/plugins/estree.mjs";
import markdown from "./vendor/prettier/plugins/markdown.mjs";
import typescript from "./vendor/prettier/plugins/typescript.mjs";
import yaml from "./vendor/prettier/plugins/yaml.mjs";

const PROFILE = JSON.parse(
  readFileSync(new URL("./profile.json", import.meta.url), "utf8"),
);
const MANAGED_SKILLS = "./.pas/harness/skills";
const USAGE =
  "Usage: node harness/pas/setup.mjs <project-dir> [--plan] [--with-ci]";
const HERE = dirname(fileURLToPath(import.meta.url));

function git(target, args, raw = false) {
  const result = spawnSync("git", args, {
    cwd: target,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  if (result.error || result.status !== 0)
    throw new Error(`Not a usable Git repository: ${target}`);
  return raw ? result.stdout : result.stdout.trim();
}

function pendingChanges(target) {
  const paths = [
    ...new Set([
      ...git(
        target,
        ["diff", "HEAD", "--name-only", "--no-renames", "-z"],
        true,
      ).split("\0"),
      ...git(
        target,
        ["ls-files", "--others", "--exclude-standard", "-z"],
        true,
      ).split("\0"),
    ]),
  ]
    .filter((path) => path && path !== ".pas/harness/state.json")
    .sort();
  return Object.fromEntries(
    paths.map((path) => {
      try {
        const absolute = join(target, path);
        const stat = lstatSync(absolute);
        const value = stat.isSymbolicLink()
          ? { link: readlinkSync(absolute) }
          : {
              sha256: createHash("sha256")
                .update(readFileSync(absolute))
                .digest("hex"),
            };
        return [path, value];
      } catch (error) {
        if (error.code === "ENOENT") return [path, { deleted: true }];
        throw error;
      }
    }),
  );
}

function targetDirectory(args) {
  const unknown = args.find(
    (arg) => arg.startsWith("--") && !["--plan", "--with-ci"].includes(arg),
  );
  if (unknown) throw new Error(`Unknown option ${unknown}. ${USAGE}`);
  const positional = args.filter((arg) => !arg.startsWith("--"));
  if (positional.length !== 1) throw new Error(USAGE);
  if (Number(process.versions.node.split(".")[0]) < PROFILE.nodeMajor)
    throw new Error(`Node ${PROFILE.nodeMajor} or newer is required.`);
  const input = resolve(positional[0]);
  const target = realpathSync(input);
  if (input !== target)
    throw new Error(
      "Symlinked targets are not supported; name the real workspace root.",
    );
  const source = resolve(HERE, "../..");
  if (
    target === source ||
    target.startsWith(`${source}${sep}`) ||
    source.startsWith(`${target}${sep}`)
  ) {
    throw new Error("The target must be outside the shared source checkout.");
  }
  if (realpathSync(git(target, ["rev-parse", "--show-toplevel"])) !== target) {
    throw new Error("Name the Git workspace root, not a nested project.");
  }
  return target;
}

function checkDestinations(target, paths) {
  for (const path of paths) {
    const rel = relative(target, resolve(target, path));
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw new Error(`Unsafe destination: ${path}`);
    let current = target;
    for (const part of rel.split(sep)) {
      current = join(current, part);
      try {
        if (lstatSync(current).isSymbolicLink())
          throw new Error(`Symlinked write destination: ${path}`);
      } catch (error) {
        if (error.code === "ENOENT") break;
        throw error;
      }
    }
  }
}

function sourceFiles(directory, prefix = "") {
  return readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(prefix, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`Shared payload must not contain symlinks: ${path}`);
      if (entry.isDirectory()) return sourceFiles(directory, path);
      return [{ path, content: readFileSync(join(directory, path)) }];
    },
  );
}

async function managedFile(target, path, content) {
  if (/\.(?:[cm]?[jt]s|json|md|ya?ml)$/.test(path)) {
    content = Buffer.from(
      await format(content.toString("utf8"), formatOptions(target, path)),
    );
  }
  return { path, content };
}

async function payload(target) {
  const files = await Promise.all(
    PROFILE.files.map((path) =>
      managedFile(target, path, readFileSync(join(HERE, "payload", path))),
    ),
  );
  for (const skill of PROFILE.skills) {
    for (const file of sourceFiles(resolve(HERE, "../../skills", skill))) {
      files.push({ ...file, path: join(MANAGED_SKILLS, skill, file.path) });
    }
  }
  return files;
}

function sourceProvenance() {
  const root = resolve(HERE, "../..");
  const files = [
    ...sourceFiles(HERE).map((file) => ({
      ...file,
      path: join("harness/pas", file.path),
    })),
    ...PROFILE.skills.flatMap((skill) =>
      sourceFiles(join(root, "skills", skill)).map((file) => ({
        ...file,
        path: join("skills", skill, file.path),
      })),
    ),
    { path: "wiring.md", content: readFileSync(join(root, "wiring.md")) },
  ].sort((left, right) => left.path.localeCompare(right.path));
  const inputs = files.map(({ path, content }) => ({
    path,
    sha256: createHash("sha256").update(content).digest("hex"),
  }));
  let revision = null;
  let localChanges = null;
  try {
    if (realpathSync(git(root, ["rev-parse", "--show-toplevel"])) === root) {
      revision = git(root, ["rev-parse", "HEAD"]);
      localChanges = Boolean(
        git(root, ["status", "--porcelain", "--untracked-files=all"]),
      );
    }
  } catch {
    // An explicit source copy is valid without Git; its content digest is authoritative.
  }
  return {
    sha256: createHash("sha256").update(JSON.stringify(inputs)).digest("hex"),
    revision,
    localChanges,
  };
}

function write(target, path, content) {
  const destination = join(target, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function writeJson(target, path, value) {
  write(target, path, `${JSON.stringify(value, null, 2)}\n`);
}

function formatOptions(target, path) {
  const unsupported = ["prettier.config", ".prettierrc"].flatMap((name) =>
    [
      "js",
      "cjs",
      "mjs",
      "ts",
      "cts",
      "mts",
      "yaml",
      "yml",
      "json5",
      "toml",
    ].map((extension) => `${name}.${extension}`),
  );
  const candidates = [".prettierrc", ".prettierrc.json", ...unsupported];
  checkDestinations(target, candidates);
  const unsafe = unsupported.find((name) => existsSync(join(target, name)));
  if (unsafe)
    throw new Error(
      `Unsupported formatter configuration ${unsafe}. Use JSON options or integrate formatting explicitly; read-only planning never evaluates project code.`,
    );
  const pkg = jsonConfig(target, "package.json");
  const config = candidates
    .slice(0, 2)
    .find((name) => existsSync(join(target, name)));
  const options = pkg.prettier ?? (config ? jsonConfig(target, config) : {});
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    options.plugins ||
    options.overrides
  ) {
    throw new Error(
      "Unsupported formatter configuration. Plain JSON options are supported; shared configs, plugins and overrides need explicit integration.",
    );
  }
  return {
    ...options,
    filepath: join(target, path),
    plugins: [babel, estree, markdown, typescript, yaml],
  };
}

function preserveUnchangedProperties(original, text) {
  const desired = JSONC.parseTree(text);
  const edits = [];
  const visit = (object, keys = []) => {
    if (object.type !== "object") return;
    for (const property of object.children ?? []) {
      const [key, value] = property.children;
      const path = [...keys, key.value];
      const current = JSONC.findNodeAtLocation(desired, path);
      if (!current) continue;
      if (
        !isDeepStrictEqual(
          JSONC.getNodeValue(value),
          JSONC.getNodeValue(current),
        )
      ) {
        visit(value, path);
        continue;
      }
      const after = current.parent;
      const originalLine = original.lastIndexOf("\n", property.offset - 1) + 1;
      const currentLine = text.lastIndexOf("\n", after.offset - 1) + 1;
      const indent =
        /^[\t ]*$/.test(original.slice(originalLine, property.offset)) &&
        /^[\t ]*$/.test(text.slice(currentLine, after.offset));
      const beforeStart = indent ? originalLine : property.offset;
      const afterStart = indent ? currentLine : after.offset;
      edits.push({
        offset: afterStart,
        length: after.offset + after.length - afterStart,
        content: original.slice(beforeStart, property.offset + property.length),
      });
    }
  };
  visit(JSONC.parseTree(original));
  return JSONC.applyEdits(text, edits);
}

async function configure(target, path, changes) {
  const existed = existsSync(join(target, path));
  let text = existed ? readFileSync(join(target, path), "utf8") : "{}\n";
  const original = text;
  const paths = [];
  for (const [keys, value, options] of changes) {
    const errors = [];
    const current = JSONC.parse(text, errors, { allowTrailingComma: true });
    if (errors.length) throw new Error(`Invalid JSON configuration: ${path}`);
    if (
      isDeepStrictEqual(
        keys.reduce((item, key) => item?.[key], current),
        value,
      )
    )
      continue;
    let changed = options?.isArrayInsertion ? keys.slice(0, -1) : keys;
    for (let length = 1; length <= changed.length; length++) {
      const ancestor = changed.slice(0, length);
      if (ancestor.reduce((item, key) => item?.[key], current) === undefined) {
        changed = ancestor;
        break;
      }
    }
    paths.push(changed);
    text = JSONC.applyEdits(
      text,
      JSONC.modify(text, keys, value, {
        formattingOptions: {
          insertSpaces: true,
          tabSize: 2,
          eol: text.includes("\r\n") ? "\r\n" : "\n",
        },
        ...options,
      }),
    );
  }
  if (paths.length) {
    if (existed) text = preserveUnchangedProperties(original, text);
    const formatted = await format(text, formatOptions(target, path));
    if (!existed) text = formatted;
    else {
      const current = JSONC.parseTree(text);
      const desired = JSONC.parseTree(formatted);
      const unique = [
        ...new Map(paths.map((keys) => [JSON.stringify(keys), keys])).values(),
      ];
      const outermost = unique.filter(
        (keys) =>
          !unique.some(
            (parent) =>
              parent.length < keys.length &&
              parent.every((key, index) => key === keys[index]),
          ),
      );
      text = JSONC.applyEdits(
        text,
        outermost.map((keys) => {
          const before = JSONC.findNodeAtLocation(current, keys);
          const after = JSONC.findNodeAtLocation(desired, keys);
          return {
            offset: before.offset,
            length: before.length,
            content: formatted.slice(after.offset, after.offset + after.length),
          };
        }),
      );
    }
  }
  return { path, content: Buffer.from(text) };
}

function jsonConfig(target, path) {
  if (!existsSync(join(target, path))) return {};
  const errors = [];
  const value = JSONC.parse(readFileSync(join(target, path), "utf8"), errors, {
    allowTrailingComma: true,
  });
  if (
    errors.length ||
    !value ||
    Array.isArray(value) ||
    typeof value !== "object"
  )
    throw new Error(`Invalid JSON configuration: ${path}`);
  return value;
}

function checkConfiguration(target, previous) {
  const fields = previous?.fields ?? [];
  const items = previous?.items ?? [];
  checkDestinations(
    target,
    [...fields, ...items].map((entry) => entry.path),
  );
  for (const [entries, arrayItem] of [
    [fields, false],
    [items, true],
  ]) {
    for (const entry of entries) {
      const config = jsonConfig(target, entry.path);
      const current = entry.keys.reduce((value, key) => value?.[key], config);
      const matches = arrayItem
        ? Array.isArray(current) &&
          current.some((value) => isDeepStrictEqual(value, entry.value))
        : isDeepStrictEqual(current, entry.value);
      if (!matches)
        throw new Error(
          `Conflict: managed configuration ${entry.path} ${entry.keys.join(".")} was changed or removed locally. Reconcile it explicitly.`,
        );
    }
  }
  if (previous?.sourceOrder) {
    const sources =
      jsonConfig(target, ".pas/skills-sources.json").sources ?? [];
    const managed = sources.filter((source) =>
      previous.sourceOrder.includes(source),
    );
    if (!isDeepStrictEqual(managed, previous.sourceOrder)) {
      throw new Error(
        "Conflict: managed pins or precedence in .pas/skills-sources.json were changed locally. Reconcile them explicitly.",
      );
    }
  }
}

async function instructionFile(
  target,
  path,
  body,
  previous,
  markers = ["<!-- dirk-skills:pas:start -->", "<!-- dirk-skills:pas:end -->"],
) {
  const [start, end] = markers;
  const text = existsSync(join(target, path))
    ? readFileSync(join(target, path), "utf8")
    : "";
  const block = start.startsWith("<!--")
    ? (
        await format(
          `${start}\n\n${body.trim()}\n\n${end}\n`,
          formatOptions(target, path),
        )
      ).trimEnd()
    : `${start}\n${body.trim()}\n${end}`;
  const begin = text.indexOf(start);
  const finish = text.indexOf(end);
  let content;
  if (begin < 0 && finish < 0) {
    if (previous?.blocks?.[path])
      throw new Error(
        `Conflict: managed instruction block in ${path} was removed locally.`,
      );
    content = `${text}${text ? (text.endsWith("\n") ? "\n" : "\n\n") : ""}${block}\n`;
  } else {
    if (
      begin < 0 ||
      finish < begin ||
      text.indexOf(start, begin + start.length) >= 0 ||
      text.indexOf(end, finish + end.length) >= 0
    ) {
      throw new Error(
        `Conflict: malformed managed instruction block in ${path}.`,
      );
    }
    const current = text.slice(begin, finish + end.length);
    const hash = createHash("sha256").update(current).digest("hex");
    if (current !== block && previous?.blocks?.[path]?.sha256 !== hash)
      throw new Error(
        `Conflict: managed instruction block in ${path} has local content.`,
      );
    content = `${text.slice(0, begin)}${block}${text.slice(finish + end.length)}`;
  }
  return {
    path,
    content: Buffer.from(content),
    block: { sha256: createHash("sha256").update(block).digest("hex") },
  };
}

async function agentConfiguration(target, manifest, previous) {
  const items = [...(previous?.items ?? [])];
  const candidates = [
    "opencode.json",
    "opencode.jsonc",
    ".opencode/opencode.json",
    ".opencode/opencode.jsonc",
  ];
  const paths = [
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/settings.json",
    ".junie/guidelines.md",
    ".github/copilot-instructions.md",
    ...candidates,
  ];
  checkDestinations(target, paths);
  for (const directory of ["", ".opencode/"]) {
    if (
      existsSync(join(target, `${directory}opencode.json`)) &&
      existsSync(join(target, `${directory}opencode.jsonc`))
    ) {
      throw new Error(
        `Both ${directory}opencode.json and opencode.jsonc exist. Choose one before installing.`,
      );
    }
  }
  const configs = candidates
    .filter((path) => existsSync(join(target, path)))
    .map((path) => ({ path, value: jsonConfig(target, path) }));
  const selected = configs.at(-1) ?? { path: "opencode.jsonc", value: {} };
  const opencodeChanges = [];
  if (selected.value.$schema === undefined)
    opencodeChanges.push([["$schema"], "https://opencode.ai/config.json"]);
  if (!configs.some(({ value }) => value.instructions?.includes("CLAUDE.md"))) {
    const instructions = selected.value.instructions ?? [];
    if (!Array.isArray(instructions))
      throw new Error(`Expected a V2 instructions array in ${selected.path}.`);
    if (selected.value.instructions === undefined)
      opencodeChanges.push([["instructions"], ["CLAUDE.md"]]);
    else
      opencodeChanges.push([
        ["instructions", instructions.length],
        "CLAUDE.md",
        { isArrayInsertion: true },
      ]);
    items.push({
      path: selected.path,
      keys: ["instructions"],
      value: "CLAUDE.md",
    });
  }
  const permissions = selected.value.permissions ?? [];
  if (!Array.isArray(permissions))
    throw new Error(
      `Expected V2 permission rules in ${selected.path}; migrate the existing configuration explicitly.`,
    );
  const rules = configs.flatMap(({ value }) => value.permissions ?? []);
  const denied = PROFILE.deniedSkills.filter(
    (skill) =>
      !rules.some(
        (rule) =>
          rule.action === "skill" && [skill, "*"].includes(rule.resource),
      ),
  );
  if (selected.value.permissions === undefined)
    opencodeChanges.push([
      ["permissions"],
      denied.map((resource) => ({ action: "skill", resource, effect: "deny" })),
    ]);
  else
    for (const resource of denied.toReversed())
      opencodeChanges.push([
        ["permissions", 0],
        { action: "skill", resource, effect: "deny" },
        { isArrayInsertion: true },
      ]);
  items.push(
    ...denied.map((resource) => ({
      path: selected.path,
      keys: ["permissions"],
      value: { action: "skill", resource, effect: "deny" },
    })),
  );
  const settings = jsonConfig(target, ".claude/settings.json");
  const hooks = settings.hooks?.PostToolUse ?? [];
  if (!Array.isArray(hooks))
    throw new Error(
      "Expected a PostToolUse hook array in .claude/settings.json.",
    );
  const hook = {
    matcher: "Edit|Write|MultiEdit",
    hooks: [
      {
        type: "command",
        command:
          'node "$CLAUDE_PROJECT_DIR/tools/agent-hooks/lint-edited-file.mjs" --claude',
      },
    ],
  };
  const hookChanges = hooks.some((entry) =>
    entry.hooks?.some((item) => item.command === hook.hooks[0].command),
  )
    ? []
    : settings.hooks?.PostToolUse === undefined
      ? [[["hooks", "PostToolUse"], [hook]]]
      : [
          [
            ["hooks", "PostToolUse", hooks.length],
            hook,
            { isArrayInsertion: true },
          ],
        ];
  if (hookChanges.length)
    items.push({
      path: ".claude/settings.json",
      keys: ["hooks", "PostToolUse"],
      value: hook,
    });
  const wiring = readFileSync(resolve(HERE, "../../wiring.md"), "utf8");
  const stanzas = [...wiring.matchAll(/```md\n([\s\S]*?)\n```/g)].map(
    (match) => match[1],
  );
  if (stanzas.length !== 3)
    throw new Error(
      "Expected the three shared activation stanzas in wiring.md.",
    );
  const template = readFileSync(join(HERE, "templates/AGENTS.md"), "utf8");
  const files = [
    await instructionFile(
      target,
      "AGENTS.md",
      `${template.trim()}\n\n${stanzas.join("\n\n")}`,
      previous,
    ),
    await configure(target, selected.path, opencodeChanges),
    await configure(target, ".claude/settings.json", hookChanges),
  ];
  const claude = existsSync(join(target, "CLAUDE.md"))
    ? readFileSync(join(target, "CLAUDE.md"), "utf8")
    : "";
  if (!/^@AGENTS\.md\s*$/m.test(claude) || previous?.blocks?.["CLAUDE.md"])
    files.push(
      await instructionFile(target, "CLAUDE.md", "@AGENTS.md", previous),
    );
  for (const path of [
    ".junie/guidelines.md",
    ".github/copilot-instructions.md",
  ]) {
    if (
      existsSync(join(target, path)) ||
      (path.startsWith(".junie/") && manifest.agents?.includes("junie"))
    ) {
      files.push(
        await instructionFile(
          target,
          path,
          "**MANDATORY** read the project instructions in `AGENTS.md`.",
          previous,
        ),
      );
    }
  }
  return {
    files,
    items,
    blocks: Object.fromEntries(
      files.filter((file) => file.block).map((file) => [file.path, file.block]),
    ),
  };
}

function execute(command, target) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: target,
    stdio: "inherit",
  });
  return {
    command,
    status: !result.error && result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    signal: result.signal,
    ...(result.error ? { error: result.error.message } : {}),
  };
}

function checkManagedFiles(target, files, previous) {
  for (const file of files) {
    const path = join(target, file.path);
    const owned = previous?.files[file.path];
    if (!existsSync(path)) {
      if (owned)
        throw new Error(
          `Conflict: managed file ${file.path} was removed locally.`,
        );
      continue;
    }
    const current = readFileSync(path);
    if (current.equals(file.content)) continue;
    const hash = createHash("sha256").update(current).digest("hex");
    if (owned?.sha256 !== hash) {
      throw new Error(
        `Conflict: ${file.path} has local content. Reconcile it explicitly; the installer will not overwrite it.`,
      );
    }
  }
}

function install(plan, files, writes, ownership) {
  if (plan.commands.length === 0) {
    process.stdout.write("harness: up to date.\n");
    return;
  }
  for (const file of writes) write(plan.target, file.path, file.content);
  const state = {
    schemaVersion: 1,
    profile: PROFILE.name,
    profileVersion: PROFILE.version,
    source: plan.source,
    status: "pending",
    commands: [],
    ...ownership,
    files: Object.fromEntries(
      files.map((file) => [
        file.path,
        { sha256: createHash("sha256").update(file.content).digest("hex") },
      ]),
    ),
    pendingChanges: pendingChanges(plan.target),
  };
  writeJson(plan.target, ".pas/harness/state.json", state);
  try {
    for (const command of plan.commands) {
      const outcome = execute(command, plan.target);
      state.commands.push(outcome);
      state.pendingChanges = pendingChanges(plan.target);
      writeJson(plan.target, ".pas/harness/state.json", state);
      if (outcome.status === "failed")
        throw new Error(
          `Command failed: ${command.join(" ")} (${outcome.error ?? outcome.exitCode ?? outcome.signal})`,
        );
    }
    state.status = "installed";
    delete state.pendingChanges;
    writeJson(plan.target, ".pas/harness/state.json", state);
  } catch (error) {
    state.status = "failed";
    state.failure = error.message;
    writeJson(plan.target, ".pas/harness/state.json", state);
    throw new Error(
      `${error.message}. Partial installation recorded in .pas/harness/state.json; no rollback was attempted.`,
    );
  }
  process.stdout.write(
    "harness: installed. Run /setup-matt-pocock-skills once to choose the project workflow settings.\n",
  );
}

async function ignoreConfiguration(target, previous) {
  checkDestinations(target, Object.keys(PROFILE.ignore));
  return Promise.all(
    Object.entries(PROFILE.ignore).map(([path, lines]) =>
      instructionFile(target, path, lines.join("\n"), previous, [
        "# dirk-skills:pas:start",
        "# dirk-skills:pas:end",
      ]),
    ),
  );
}

async function workspaceConfiguration(target) {
  const path = "nx.json";
  const nx = jsonConfig(target, path);
  const keys = ["targetDefaults", "@nx/eslint:lint"];
  const lint = nx.targetDefaults?.["@nx/eslint:lint"] ?? {};
  const formatter = "./tools/eslint/agent-formatter.cjs";
  if (lint.options?.format !== undefined && lint.options.format !== formatter) {
    throw new Error(
      "Conflict: nx.json @nx/eslint:lint options.format has local content. Integrate the agent formatter explicitly.",
    );
  }
  const changes = [[keys.concat("options", "format"), formatter]];
  const inputs = lint.inputs ?? ["default", "^default"];
  if (!Array.isArray(inputs))
    throw new Error("Expected an inputs array for nx.json @nx/eslint:lint.");
  const added = [
    "{workspaceRoot}/eslint.config.mjs",
    "{workspaceRoot}/tools/eslint/**/*",
  ].filter((input) => !inputs.includes(input));
  if (lint.inputs === undefined)
    changes.push([keys.concat("inputs"), [...inputs, ...added]]);
  else
    for (const [index, input] of added.entries())
      changes.push([
        keys.concat("inputs", inputs.length + index),
        input,
        { isArrayInsertion: true },
      ]);
  return {
    files: [await configure(target, path, changes)],
    fields: [
      { path, keys: keys.concat("options", "format"), value: formatter },
    ],
    items: added.map((value) => ({ path, keys: keys.concat("inputs"), value })),
  };
}

function projectFiles(target, directory = "packages") {
  checkDestinations(target, [directory]);
  if (!existsSync(join(target, directory))) return [];
  return readdirSync(join(target, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      if (
        entry.name.startsWith(".") ||
        ["node_modules", "dist", "out-tsc", "coverage"].includes(entry.name)
      )
        return [];
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return projectFiles(target, path);
      if (!["project.json", "tsconfig.json"].includes(entry.name)) return [];
      checkDestinations(target, [path]);
      return [path];
    },
  );
}

async function projectConfiguration(target) {
  const result = { files: [], fields: [], items: [] };
  for (const path of projectFiles(target)) {
    const normalized = path.split(sep).join("/");
    const layer = /\/service\/(types|client)\/project\.json$/.exec(
      normalized,
    )?.[1];
    if (layer) {
      const tags = jsonConfig(target, path).tags ?? [];
      if (!Array.isArray(tags))
        throw new Error(`Expected a tags array in ${path}.`);
      const value = `pas-${layer}`;
      if (
        tags.some(
          (tag) =>
            [
              "pas-app",
              "pas-service",
              "pas-client",
              "pas-types",
              "pas-bundle",
            ].includes(tag) && tag !== value,
        )
      ) {
        throw new Error(
          `Conflict: incompatible PAS layer tag in ${path}. Reconcile it with ${value} explicitly; team tags will be preserved.`,
        );
      }
      if (!tags.includes(value)) {
        const change = tags.length
          ? [["tags", tags.length], value, { isArrayInsertion: true }]
          : [["tags"], [value]];
        result.files.push(await configure(target, path, [change]));
        result.items.push({ path, keys: ["tags"], value });
      }
    }
    if (
      normalized.includes("/service/") &&
      normalized.endsWith("/tsconfig.json")
    ) {
      const keys = ["compilerOptions", "strict"];
      if (jsonConfig(target, path).compilerOptions?.strict === false) {
        throw new Error(
          `Conflict: ${path} explicitly disables strict mode. Enable it explicitly before applying the PAS harness.`,
        );
      }
      result.files.push(await configure(target, path, [[keys, true]]));
      result.fields.push({ path, keys, value: true });
    }
  }
  return result;
}

function packageConfiguration(pkg, previous) {
  const changes = [];
  const owned = (keys) =>
    previous?.fields?.some(
      (field) =>
        field.path === "package.json" && isDeepStrictEqual(field.keys, keys),
    );
  for (const [name, command] of Object.entries({
    verify: "node tools/verify.mjs",
    typecheck: "node tools/typecheck.mjs",
    "tracker-lint": "node tools/tracker-lint.mjs",
  })) {
    if (pkg.scripts?.[name] !== undefined && pkg.scripts[name] !== command) {
      throw new Error(
        `Conflict: package.json scripts.${name} has local content. Integrate ${command} explicitly before installing.`,
      );
    }
    changes.push([["scripts", name], command]);
  }
  for (const [name, command] of Object.entries({
    prepare: "husky",
    postinstall: "pas-link-skills",
  })) {
    const current = pkg.scripts?.[name];
    if (current === undefined || owned(["scripts", name]))
      changes.push([["scripts", name], command]);
    else if (
      typeof current !== "string" ||
      !current.split(/\s*&&\s*/).includes(command)
    ) {
      throw new Error(
        `Conflict: package.json scripts.${name} needs ${command}. Integrate it with the existing command explicitly; it will not be replaced.`,
      );
    }
  }
  for (const [name, version] of Object.entries(PROFILE.devDependencies)) {
    if (pkg.dependencies?.[name] !== undefined)
      throw new Error(
        `Conflict: package.json dependencies.${name} is human-owned. Reconcile its placement and pin explicitly.`,
      );
    const current = pkg.devDependencies?.[name];
    if (
      current !== undefined &&
      current !== version &&
      !owned(["devDependencies", name])
    ) {
      throw new Error(
        `Conflict: package.json devDependencies.${name} is ${current}, not the profile pin ${version}. Reconcile it explicitly.`,
      );
    }
    changes.push([["devDependencies", name], version]);
  }
  return changes;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const target = targetDirectory(args);
  checkDestinations(target, [
    "package.json",
    "nx.json",
    ".pas/skills-sources.json",
    ".pas/harness/state.json",
  ]);
  for (const path of ["package.json", "nx.json", ".pas/skills-sources.json"]) {
    if (!existsSync(join(target, path)))
      throw new Error(`Missing PAS prerequisite: ${path}`);
  }
  const stateFile = join(target, ".pas/harness/state.json");
  const previous = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, "utf8"))
    : undefined;
  checkConfiguration(target, previous);
  const manifest = JSON.parse(
    readFileSync(join(target, ".pas/skills-sources.json"), "utf8"),
  );
  const local = "./.pas/skills";
  const sources = [
    ...new Set([
      PROFILE.baselineSkillSource,
      ...manifest.sources.filter(
        (source) =>
          source !== PROFILE.baselineSkillSource &&
          source !== local &&
          source !== MANAGED_SKILLS &&
          !/^https:\/\/github\.com\/mattpocock\/skills\/tree\/[^/]+\/skills\/(engineering|productivity)\/?$/.test(
            source,
          ),
      ),
      ...PROFILE.skillSources,
      MANAGED_SKILLS,
      local,
    ]),
  ];
  const files = await payload(target);
  const ci = ".gitlab-ci.yml";
  if (
    (args.includes("--with-ci") || previous?.files?.[ci]) &&
    (!existsSync(join(target, ci)) || previous?.files?.[ci])
  ) {
    checkDestinations(target, [ci]);
    files.push(
      await managedFile(
        target,
        ci,
        readFileSync(join(HERE, "templates/gitlab-ci.yml")),
      ),
    );
  }
  checkDestinations(target, [
    ...files.map((file) => file.path),
    ...Object.keys(PROFILE.defaults),
  ]);
  const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  const agents = await agentConfiguration(target, manifest, previous);
  const workspace = await workspaceConfiguration(target);
  const projects = await projectConfiguration(target);
  const ignores = await ignoreConfiguration(target, previous);
  const packageChanges = packageConfiguration(pkg, previous);
  const configured = [
    ...agents.files,
    ...workspace.files,
    ...projects.files,
    ...ignores,
    ...Object.entries(PROFILE.defaults)
      .filter(([path]) => !existsSync(join(target, path)))
      .map(([path, content]) => ({ path, content: Buffer.from(content) })),
    await configure(target, ".pas/skills-sources.json", [
      [["sources"], sources],
    ]),
    await configure(target, "package.json", packageChanges),
  ];
  const writes = [...files, ...configured].filter(
    (file) =>
      !existsSync(join(target, file.path)) ||
      !readFileSync(join(target, file.path)).equals(file.content),
  );
  checkManagedFiles(target, files, previous);
  const source = sourceProvenance();
  const unchanged =
    writes.length === 0 &&
    previous?.status === "installed" &&
    previous.profileVersion === PROFILE.version &&
    isDeepStrictEqual(previous.source, source);
  const resumable =
    ["pending", "failed"].includes(previous?.status) &&
    previous.pendingChanges &&
    isDeepStrictEqual(previous.pendingChanges, pendingChanges(target));
  if (
    !unchanged &&
    !resumable &&
    git(target, ["status", "--porcelain", "--untracked-files=all"])
  ) {
    throw new Error(
      "The target has uncommitted work. Commit or move it first; installation and updates require a clean checkout.",
    );
  }
  const plan = {
    profile: PROFILE.name,
    operation: resumable ? "resume" : previous ? "update" : "bootstrap",
    target,
    source,
    writes: [
      ...writes,
      ...(unchanged ? [] : [{ path: ".pas/harness/state.json" }]),
    ].map(({ path }) => ({
      path,
      action: existsSync(join(target, path)) ? "update" : "create",
    })),
    sources,
    commands: unchanged
      ? []
      : [
          ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund"],
          ["npm", "exec", "--no", "--", "husky"],
          ["npm", "exec", "--no", "--", "pas-link-skills"],
          ["npm", "run", "verify"],
        ],
  };
  if (args.includes("--plan")) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  install(plan, files, writes, {
    blocks: {
      ...agents.blocks,
      ...Object.fromEntries(ignores.map((file) => [file.path, file.block])),
    },
    items: [...agents.items, ...workspace.items, ...projects.items],
    fields: [
      ...packageChanges.map(([keys, value]) => ({
        path: "package.json",
        keys,
        value,
      })),
      ...workspace.fields,
      ...projects.fields,
    ],
    sourceOrder: [
      PROFILE.baselineSkillSource,
      ...PROFILE.skillSources,
      MANAGED_SKILLS,
      local,
    ],
  });
}

try {
  await main();
} catch (error) {
  process.stderr.write(`harness: ${error.message}\n`);
  process.exitCode = 1;
}
