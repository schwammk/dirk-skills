import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SETUP = join(REPO, "harness/pas/setup.mjs");

function write(root, path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, HUSKY: "0", GIT_OPTIONAL_LOCKS: "0", ...env },
  });
}

function fixture(t) {
  const directory = mkdtempSync("/tmp/opencode/harness-pas-test-");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const project = join(directory, "project");
  mkdirSync(project);
  write(
    project,
    "package.json",
    '{"name":"fixture","private":true,"scripts":{"postinstall":"pas-link-skills","custom":"node custom.mjs"}}\n',
  );
  write(project, "nx.json", "{}\n");
  write(
    project,
    ".pas/skills-sources.json",
    '{"agents":["claude-code","junie","universal"],"sources":["./node_modules/@pas/dev-guidelines","./.pas/skills"],"gitignore":false}\n',
  );
  assert.equal(run("git", ["init", "--quiet"], project).status, 0);
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "fixture",
      ],
      project,
    ).status,
    0,
  );
  return { directory, project };
}

function snapshot(root, prefix = "") {
  const files = {};
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const path = join(prefix, name);
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink())
      files[path] = `link:${readlinkSync(join(root, path))}`;
    else if (stat.isDirectory()) Object.assign(files, snapshot(root, path));
    else files[path] = readFileSync(join(root, path)).toString("base64");
  }
  return files;
}

function commands(directory) {
  const script = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.HARNESS_TRACE, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
process.exit(process.env.HARNESS_FAIL === process.argv.slice(2).join(' ') ? 71 : 0);
`;
  write(directory, "bin/npm", script);
  chmodSync(join(directory, "bin/npm"), 0o755);
  return {
    PATH: `${join(directory, "bin")}:${process.env.PATH}`,
    HARNESS_TRACE: join(directory, "commands.jsonl"),
  };
}

function json(project, path) {
  return JSON.parse(readFileSync(join(project, path), "utf8"));
}

function sharedSnapshot(directory) {
  const root = join(directory, "shared-source");
  mkdirSync(root);
  for (const path of ["harness", "skills", "wiring.md"])
    cpSync(join(REPO, path), join(root, path), { recursive: true });
  return root;
}

test("--plan describes bootstrap without changing the target or running npm", (t) => {
  const { directory, project } = fixture(t);
  const bin = join(directory, "bin");
  write(
    directory,
    "bin/npm",
    '#!/bin/sh\nprintf unexpected > "$0.called"\nexit 91\n',
  );
  chmodSync(join(bin, "npm"), 0o755);
  const before = snapshot(project);

  const result = run(process.execPath, [SETUP, project, "--plan"], REPO, {
    PATH: `${bin}:${process.env.PATH}`,
  });

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.profile, "pas");
  assert.equal(plan.operation, "bootstrap");
  assert.equal(plan.target, project);
  assert.ok(plan.writes.some((entry) => entry.path === "tools/verify.mjs"));
  assert.ok(plan.sources.includes("./.pas/harness/skills"));
  assert.ok(
    plan.sources.some((source) =>
      source.includes("6fd947921b935b7e1e69293a200400f0fdd5c15f"),
    ),
  );
  assert.ok(
    plan.commands.some(
      (command) => command[0] === "npm" && command[1] === "install",
    ),
  );
  assert.deepEqual(snapshot(project), before);
  assert.equal(readdirSync(bin).includes("npm.called"), false);
});

test("read-only planning rejects executable formatter configuration without evaluating it", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  write(
    project,
    "prettier.config.mjs",
    "import { writeFileSync } from 'node:fs'; writeFileSync('unexpected', 'executed'); export default {};\n",
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "formatter configuration",
      ],
      project,
    ).status,
    0,
  );
  const before = snapshot(project);

  const result = run(process.execPath, [SETUP, project, "--plan"], REPO, env);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /formatter configuration.*prettier\.config\.mjs/i,
  );
  assert.deepEqual(snapshot(project), before);
  assert.equal(readdirSync(directory).includes("commands.jsonl"), false);
});

test("managed runtime files follow JSON formatter options without reformatting human prose or shared skill bodies", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const prose = "# Human notes\n\nA deliberately unformatted   sentence.\n";
  write(project, ".prettierrc", '{"singleQuote":true,"semi":false}\n');
  write(project, "README.md", prose);
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "formatter preferences",
      ],
      project,
    ).status,
    0,
  );
  const before = snapshot(project);
  const preview = run(process.execPath, [SETUP, project, "--plan"], REPO, env);
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(snapshot(project), before);

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    readFileSync(join(project, "tools/instructions-lint.mjs"), "utf8"),
    /from 'node:fs'\n/,
  );
  assert.match(
    readFileSync(
      join(project, ".opencode/plugins/lint-edited-file.ts"),
      "utf8",
    ),
    /from 'node:child_process'\n/,
  );
  assert.equal(readFileSync(join(project, "README.md"), "utf8"), prose);
  assert.deepEqual(
    readFileSync(
      join(project, ".pas/harness/skills/pattern-decision/SKILL.md"),
    ),
    readFileSync(join(REPO, "skills/pattern-decision/SKILL.md")),
  );
});

test("bootstrap installs a consumer-owned snapshot and runs consumer commands in the target", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  const pkg = json(project, "package.json");
  assert.equal(pkg.scripts.verify, "node tools/verify.mjs");
  assert.equal(pkg.scripts.postinstall, "pas-link-skills");
  assert.equal(pkg.scripts.custom, "node custom.mjs");
  assert.equal(pkg.devDependencies.skills, "1.7.2");
  assert.ok(!pkg.scripts.verify.includes("REQUIRE_ENGINE"));
  const sources = json(project, ".pas/skills-sources.json");
  assert.deepEqual(sources.agents, ["claude-code", "junie", "universal"]);
  assert.equal(sources.sources.at(-2), "./.pas/harness/skills");
  assert.equal(sources.sources.at(-1), "./.pas/skills");
  assert.ok(!JSON.stringify(sources).includes(REPO));
  const state = json(project, ".pas/harness/state.json");
  const verify = readFileSync(join(project, "tools/verify.mjs"));
  assert.equal(state.status, "installed");
  assert.equal(
    state.files["tools/verify.mjs"].sha256,
    createHash("sha256").update(verify).digest("hex"),
  );
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          join(
            project,
            ".pas/harness/skills/pattern-decision/INTERVIEW-FORMAT.md",
          ),
        ),
      )
      .digest("hex"),
    "9999872f7d29a971b7e53fd8a2838190b0a84dc3eddc8e733a03cd782bdf061b",
  );
  const calls = readFileSync(env.HARNESS_TRACE, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.ok(calls.every((call) => call.cwd === project));
  assert.ok(calls.some((call) => call.args.includes("pas-link-skills")));
  assert.deepEqual(calls.at(-1).args, ["run", "verify"]);
});

test("an unchanged rerun is a no-op, including dependencies and skill sources", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const installed = run(process.execPath, [SETUP, project], REPO, env);
  assert.equal(installed.status, 0, installed.stderr);
  const before = snapshot(project);
  const trace = readFileSync(env.HARNESS_TRACE, "utf8");

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /up to date/i);
  assert.deepEqual(snapshot(project), before);
  assert.equal(readFileSync(env.HARNESS_TRACE, "utf8"), trace);
  const plan = run(process.execPath, [SETUP, project, "--plan"], REPO, env);
  assert.equal(plan.status, 0, plan.stderr);
  assert.deepEqual(JSON.parse(plan.stdout).writes, []);
  assert.deepEqual(JSON.parse(plan.stdout).commands, []);
});

test("a locally edited managed file is a conflict before any plan or installation writes", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const installed = run(process.execPath, [SETUP, project], REPO, env);
  assert.equal(installed.status, 0, installed.stderr);
  write(project, "tools/verify.mjs", "// a deliberate local customization\n");
  const before = snapshot(project);
  const trace = readFileSync(env.HARNESS_TRACE, "utf8");

  for (const flags of [["--plan"], []]) {
    const result = run(process.execPath, [SETUP, project, ...flags], REPO, env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflict.*tools\/verify\.mjs/i);
    assert.deepEqual(snapshot(project), before);
    assert.equal(readFileSync(env.HARNESS_TRACE, "utf8"), trace);
  }
});

test("a pre-existing custom verify command is a conflict, not an overwrite", (t) => {
  const { project } = fixture(t);
  const pkg = json(project, "package.json");
  pkg.scripts.verify = "node human-owned-checks.mjs";
  write(project, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "custom verify",
      ],
      project,
    ).status,
    0,
  );
  const before = snapshot(project);

  const result = run(process.execPath, [SETUP, project, "--plan"], REPO);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /conflict.*scripts\.verify/i);
  assert.deepEqual(snapshot(project), before);
});

test("bootstrap wires durable npm entry points and preserves already integrated lifecycle commands", (t) => {
  const { directory, project } = fixture(t);
  const pkg = json(project, "package.json");
  pkg.scripts.postinstall = "node team-postinstall.mjs && pas-link-skills";
  pkg.scripts.prepare = "husky && node team-prepare.mjs";
  write(project, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "team lifecycle",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  const scripts = json(project, "package.json").scripts;
  assert.equal(scripts.postinstall, pkg.scripts.postinstall);
  assert.equal(scripts.prepare, pkg.scripts.prepare);
  assert.equal(scripts.typecheck, "node tools/typecheck.mjs");
  assert.equal(scripts["tracker-lint"], "node tools/tracker-lint.mjs");
  assert.equal(scripts.custom, "node custom.mjs");
  const owned = json(project, ".pas/harness/state.json").fields;
  assert.equal(
    owned.some((field) => field.keys.join(".") === "scripts.prepare"),
    false,
  );
});

test("missing lifecycle entry points are installed for normal npm installs and new clones", (t) => {
  const { directory, project } = fixture(t);
  const pkg = json(project, "package.json");
  delete pkg.scripts.postinstall;
  write(project, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "without lifecycle",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  const scripts = json(project, "package.json").scripts;
  assert.equal(scripts.postinstall, "pas-link-skills");
  assert.equal(scripts.prepare, "husky");
  assert.equal(scripts.custom, "node custom.mjs");
});

test("bootstrap reports incompatible scripts and dependency pins instead of silently replacing them", async (t) => {
  for (const [section, name, value] of [
    ["scripts", "typecheck", "node team-typecheck.mjs"],
    ["scripts", "postinstall", "node team-postinstall.mjs"],
    ["scripts", "prepare", "node team-prepare.mjs"],
    ["devDependencies", "skills", "9.0.0"],
  ])
    await t.test(`${section}.${name}`, (t) => {
      const { directory, project } = fixture(t);
      const pkg = json(project, "package.json");
      pkg[section] = { ...pkg[section], [name]: value };
      write(project, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
      assert.equal(run("git", ["add", "."], project).status, 0);
      assert.equal(
        run(
          "git",
          [
            "-c",
            "user.name=Harness Test",
            "-c",
            "user.email=harness@example.invalid",
            "commit",
            "--quiet",
            "-m",
            "human entry point",
          ],
          project,
        ).status,
        0,
      );
      const before = snapshot(project);

      const result = run(
        process.execPath,
        [SETUP, project, "--plan"],
        REPO,
        commands(directory),
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, /conflict/i);
      assert.ok(result.stderr.includes(`${section}.${name}`), result.stderr);
      assert.deepEqual(snapshot(project), before);
    });
});

test("adding managed settings preserves an existing compact instruction array verbatim", (t) => {
  const { directory, project } = fixture(t);
  write(
    project,
    "opencode.json",
    '{\n  "$schema": "https://opencode.ai/config.json",\n  "instructions": ["CLAUDE.md"]\n}\n',
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "configured instructions",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    readFileSync(join(project, "opencode.json"), "utf8"),
    /  "instructions": \["CLAUDE\.md"\],\n/,
  );
});

test("new managed JSON properties use the consumer indentation settings", (t) => {
  const { directory, project } = fixture(t);
  write(project, ".prettierrc", '{"tabWidth":4}\n');
  write(
    project,
    "opencode.json",
    '{\n    "$schema": "https://opencode.ai/config.json",\n    "instructions": ["CLAUDE.md"]\n}\n',
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "consumer indentation",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    readFileSync(join(project, "opencode.json"), "utf8"),
    /^ {4}"permissions": \[/m,
  );
});

test("configuration edits preserve unrelated JSON text and consumer-selected agents", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  write(
    project,
    "package.json",
    '{\n\t"name"   : "fixture",\n\t"private": true,\n\t"scripts": { "postinstall": "pas-link-skills", "custom": "node custom.mjs" }\n}\n',
  );
  const manifest = json(project, ".pas/skills-sources.json");
  manifest.agents = ["universal"];
  manifest.sources.splice(1, 0, "./team-skills");
  manifest.team = { enabled: true };
  write(
    project,
    ".pas/skills-sources.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "custom configuration",
      ],
      project,
    ).status,
    0,
  );

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    readFileSync(join(project, "package.json"), "utf8").includes(
      '\t"name"   : "fixture"',
    ),
  );
  const installed = json(project, ".pas/skills-sources.json");
  assert.deepEqual(installed.agents, ["universal"]);
  assert.deepEqual(installed.team, { enabled: true });
  assert.ok(
    installed.sources.indexOf("./team-skills") <
      installed.sources.indexOf("./.pas/harness/skills"),
  );
});

test("source normalization replaces stale Matt refs while preserving unrelated source order and local-last overrides", (t) => {
  const { directory, project } = fixture(t);
  const manifest = json(project, ".pas/skills-sources.json");
  manifest.sources = [
    "./team-first",
    "https://github.com/mattpocock/skills/tree/main/skills/engineering",
    "./node_modules/@pas/dev-guidelines",
    "./team-second",
    "https://github.com/mattpocock/skills/tree/old-pin/skills/productivity",
    "./.pas/skills",
    "./.pas/harness/skills",
  ];
  write(
    project,
    ".pas/skills-sources.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "sources",
      ],
      project,
    ).status,
    0,
  );

  const result = run(process.execPath, [SETUP, project, "--plan"], directory);

  assert.equal(result.status, 0, result.stderr);
  const sources = JSON.parse(result.stdout).sources;
  assert.deepEqual(sources.slice(0, 3), [
    "./node_modules/@pas/dev-guidelines",
    "./team-first",
    "./team-second",
  ]);
  assert.equal(sources.length, 7);
  assert.ok(
    sources
      .slice(3, 5)
      .every((source) =>
        source.includes("6fd947921b935b7e1e69293a200400f0fdd5c15f"),
      ),
  );
  assert.deepEqual(sources.slice(-2), [
    "./.pas/harness/skills",
    "./.pas/skills",
  ]);
});

test("the installed PAS profile contains the complete shared skills and consumer tooling, without product files", (t) => {
  const { directory, project } = fixture(t);
  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );
  assert.equal(result.status, 0, result.stderr);
  for (const skill of [
    "arch-cycles",
    "arch-report-mermaid",
    "enforcing-quality-gates",
    "pattern-decision",
    "pattern-review",
    "pas-specupdate",
    "pas-spec-driven-development",
    "pas-generate-code",
    "pas-code-review",
    "grilling",
    "improve-codebase-architecture",
  ]) {
    assert.match(
      readFileSync(
        join(project, ".pas/harness/skills", skill, "SKILL.md"),
        "utf8",
      ),
      /^---\n/,
    );
  }
  for (const file of [
    "tools/verify.mjs",
    "tools/typecheck.mjs",
    "tools/tracker-lint.mjs",
    "tools/instructions-lint.mjs",
    "tools/expectation-guard.mjs",
    "tools/coverage-ratchet.mjs",
    "tools/eslint/agent-formatter.cjs",
    "tools/agent-hooks/lint-edited-file.mjs",
    ".opencode/plugins/lint-edited-file.ts",
    ".husky/pre-commit",
    ".husky/commit-msg",
    ".husky/pre-push",
    "lint-staged.config.mjs",
    "commitlint.config.mjs",
    ".pas/harness/skills/arch-cycles/scripts/arch-cycles.sh",
    ".pas/harness/skills/arch-report-mermaid/scripts/validate-mermaid.sh",
    ".pas/harness/skills/arch-report-mermaid/scripts/validate-mermaid.mjs",
    ".pas/harness/skills/arch-report-mermaid/scripts/package.json",
    ".pas/harness/skills/arch-report-mermaid/scripts/package-lock.json",
  ]) {
    assert.ok(readFileSync(join(project, file)).length > 0, file);
  }
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          join(
            project,
            ".pas/harness/skills/improve-codebase-architecture/HTML-REPORT.md",
          ),
        ),
      )
      .digest("hex"),
    "6fa44e75f334307d77920e2471fd0b3f621bc9cb5e7ea05a19311fc109589de0",
  );
  assert.match(
    readFileSync(
      join(project, ".pas/harness/skills/pas-specupdate/SKILL.md"),
      "utf8",
    ),
    /under `\.scratch\/`, or the configured tracker/,
  );
  const installedPaths = Object.keys(
    json(project, ".pas/harness/state.json").files,
  );
  assert.ok(
    !installedPaths.some((path) =>
      /review-config|review-instance|\.scratch\/|\.verify\/|coverage\//.test(
        path,
      ),
    ),
  );
  assert.deepEqual(json(project, "tools/typecheck-exclude.json"), {});
});

test("a blank consumer receives the PAS lint rules and their explicit runtime dependencies", (t) => {
  const { directory, project } = fixture(t);
  write(project, ".prettierrc", '{"singleQuote":true}\n');
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "PAS formatter defaults",
      ],
      project,
    ).status,
    0,
  );
  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );
  assert.equal(result.status, 0, result.stderr);

  const config = readFileSync(join(project, "eslint.config.mjs"), "utf8");
  assert.match(config, /sourceTag: 'pas-app'/);
  assert.match(config, /max-lines-per-function/);
  assert.match(config, /A focused test hides/);
  const pkg = json(project, "package.json");
  assert.equal(pkg.devDependencies["@nx/eslint"], "22.7.12");
  assert.equal(pkg.devDependencies["@nx/eslint-plugin"], "22.7.12");
  assert.equal(pkg.devDependencies.eslint, "9.39.5");
});

test("Nx lint wiring retains custom targets, cache inputs, options and JSONC comments", (t) => {
  const { directory, project } = fixture(t);
  write(
    project,
    "nx.json",
    '{\n  // Team cache policy.\n  "targetDefaults": {\n    "team-check": { "cache": false },\n    "@nx/eslint:lint": { "inputs": ["default", "team-input"], "options": { "quiet": true } }\n  }\n}\n',
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "Nx policy",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(join(project, "nx.json"), "utf8");
  assert.match(text, /Team cache policy/);
  const nx = JSON.parse(text.replace(/\/\/[^\n]*/g, ""));
  const lint = nx.targetDefaults["@nx/eslint:lint"];
  assert.deepEqual(nx.targetDefaults["team-check"], { cache: false });
  assert.equal(lint.options.quiet, true);
  assert.equal(lint.options.format, "./tools/eslint/agent-formatter.cjs");
  assert.deepEqual(lint.inputs, [
    "default",
    "team-input",
    "{workspaceRoot}/eslint.config.mjs",
    "{workspaceRoot}/tools/eslint/**/*",
  ]);
});

test("generated evidence and linked skill trees are ignored without replacing human ignore rules", (t) => {
  const { directory, project } = fixture(t);
  write(project, ".gitignore", "# Team files\n/team-output\n");
  write(
    project,
    ".prettierignore",
    "# Team formatting policy\nteam-generated/**\n",
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "ignore policy",
      ],
      project,
    ).status,
    0,
  );
  const env = commands(directory);

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    readFileSync(join(project, ".gitignore"), "utf8").startsWith(
      "# Team files\n/team-output\n",
    ),
  );
  assert.ok(
    readFileSync(join(project, ".prettierignore"), "utf8").startsWith(
      "# Team formatting policy\nteam-generated/**\n",
    ),
  );
  assert.equal(
    run("git", ["check-ignore", "--quiet", ".verify/evidence.json"], project)
      .status,
    0,
  );
  assert.equal(
    run("git", ["check-ignore", "--quiet", ".npm/cache/file"], project).status,
    0,
  );
  const prettierIgnore = readFileSync(join(project, ".prettierignore"), "utf8");
  for (const path of [
    "/.pas/harness/skills",
    "/.agents/skills",
    "/.claude/skills",
    "/.junie/skills",
    "/.verify",
    "/.scratch",
  ])
    assert.ok(prettierIgnore.split("\n").includes(path), path);
  const before = snapshot(project);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  assert.deepEqual(snapshot(project), before);
});

test("PAS project rules add layer tags and service strictness without dropping team configuration", (t) => {
  const { directory, project } = fixture(t);
  for (const layer of ["types", "client"])
    write(
      project,
      `packages/example/service/${layer}/project.json`,
      JSON.stringify({
        name: `example-${layer}`,
        tags: ["team:example"],
        targets: { custom: { executor: "nx:noop" } },
      }),
    );
  write(
    project,
    "packages/example/service/impl/tsconfig.json",
    '{\n  // Keep module policy.\n  "compilerOptions": { "module": "commonjs" }\n}\n',
  );
  write(
    project,
    "packages/example/app/impl/tsconfig.json",
    '{"compilerOptions":{"strict":false}}\n',
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "project configuration",
      ],
      project,
    ).status,
    0,
  );

  const result = run(
    process.execPath,
    [SETUP, project],
    REPO,
    commands(directory),
  );

  assert.equal(result.status, 0, result.stderr);
  for (const layer of ["types", "client"]) {
    const config = json(
      project,
      `packages/example/service/${layer}/project.json`,
    );
    assert.deepEqual(config.tags, ["team:example", `pas-${layer}`]);
    assert.deepEqual(config.targets.custom, { executor: "nx:noop" });
  }
  const service = readFileSync(
    join(project, "packages/example/service/impl/tsconfig.json"),
    "utf8",
  );
  assert.match(service, /Keep module policy/);
  assert.match(service, /"module": "commonjs"/);
  assert.match(service, /"strict": true/);
  assert.equal(
    json(project, "packages/example/app/impl/tsconfig.json").compilerOptions
      .strict,
    false,
  );
});

test("incompatible human PAS policies are explicit conflicts, not silent configuration changes", async (t) => {
  for (const [path, content] of [
    [
      "nx.json",
      '{"targetDefaults":{"@nx/eslint:lint":{"options":{"format":"human-formatter"}}}}',
    ],
    [
      "packages/example/service/impl/tsconfig.json",
      '{"compilerOptions":{"strict":false}}',
    ],
    [
      "packages/example/service/types/project.json",
      '{"tags":["team:example","pas-app"]}',
    ],
  ])
    await t.test(path, (t) => {
      const { project } = fixture(t);
      write(project, path, content);
      assert.equal(run("git", ["add", "."], project).status, 0);
      assert.equal(
        run(
          "git",
          [
            "-c",
            "user.name=Harness Test",
            "-c",
            "user.email=harness@example.invalid",
            "commit",
            "--quiet",
            "-m",
            "human policy",
          ],
          project,
        ).status,
        0,
      );
      const before = snapshot(project);

      const result = run(process.execPath, [SETUP, project, "--plan"], REPO);

      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /conflict/i);
      assert.ok(result.stderr.includes(path), result.stderr);
      assert.deepEqual(snapshot(project), before);
    });
});

test("agent wiring preserves project instructions, existing hooks, JSONC comments and later Matt setup output", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const instructions =
    "# Product\n\nHuman-owned project policy.\n\n<!-- nx configuration -->\nKeep the Nx guidance.\n<!-- nx configuration end -->\n";
  const claude = "# Claude guidelines\n\nRead `.agents/AGENTS.md`.\n";
  write(project, "AGENTS.md", instructions);
  write(project, "CLAUDE.md", claude);
  write(
    project,
    ".claude/settings.json",
    JSON.stringify(
      {
        hooks: {
          SessionStart: [
            { hooks: [{ type: "command", command: "echo PAS reminder" }] },
          ],
          PostToolUse: [
            {
              matcher: "Read",
              hooks: [{ type: "command", command: "echo human hook" }],
            },
          ],
        },
      },
      null,
      2,
    ),
  );
  write(
    project,
    ".opencode/opencode.jsonc",
    '{\n  // Keep this model and permission.\n  "model": "human/provider",\n  "permissions": [\n    // Human policy has the last word.\n    { "action": "shell", "resource": "git push *", "effect": "ask" }\n  ],\n  "instructions": ["TEAM.md"],\n  "agents": { "reviewer": { "description": "Human reviewer" } },\n}\n',
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "agent configuration",
      ],
      project,
    ).status,
    0,
  );

  const result = run(process.execPath, [SETUP, project], REPO, env);

  assert.equal(result.status, 0, result.stderr);
  const agents = readFileSync(join(project, "AGENTS.md"), "utf8");
  assert.ok(agents.startsWith(instructions));
  assert.match(agents, /call the Skill tool with\s+"pattern-decision"/);
  assert.match(agents, /"arch-cycles"/);
  assert.match(agents, /"arch-report-mermaid"/);
  assert.match(agents, /"enforcing-quality-gates"/);
  assert.match(agents, /## Workflow/);
  const installedClaude = readFileSync(join(project, "CLAUDE.md"), "utf8");
  assert.ok(installedClaude.startsWith(claude));
  assert.match(installedClaude, /@AGENTS\.md/);
  const settings = json(project, ".claude/settings.json");
  assert.equal(
    settings.hooks.SessionStart[0].hooks[0].command,
    "echo PAS reminder",
  );
  assert.equal(
    settings.hooks.PostToolUse[0].hooks[0].command,
    "echo human hook",
  );
  assert.equal(
    settings.hooks.PostToolUse.filter(
      (entry) => entry.matcher === "Edit|Write|MultiEdit",
    ).length,
    1,
  );
  const opencode = readFileSync(
    join(project, ".opencode/opencode.jsonc"),
    "utf8",
  );
  assert.match(opencode, /Keep this model and permission/);
  assert.match(opencode, /Human policy has the last word/);
  assert.match(opencode, /"model": "human\/provider"/);
  assert.match(opencode, /"resource": "git push \*"/);
  assert.match(opencode, /"description": "Human reviewer"/);
  assert.match(opencode, /"TEAM\.md"/);
  assert.match(opencode, /"CLAUDE\.md"/);
  assert.match(opencode, /"resource": "brainstorming"/);

  // The pinned Matt setup skill chooses CLAUDE.md when it exists.
  write(
    project,
    "CLAUDE.md",
    `${installedClaude}\n## Agent skills\n\n### Issue tracker\n\nUse GitLab. See docs/agents/issue-tracker.md.\n`,
  );
  write(
    project,
    "docs/agents/issue-tracker.md",
    "# Tracker\n\nUse GitLab, not local Markdown.\n",
  );
  const lint = run(
    process.execPath,
    [join(project, "tools/instructions-lint.mjs")],
    project,
  );
  assert.equal(lint.status, 0, lint.stderr);
  const afterSetup = snapshot(project);
  const rerun = run(process.execPath, [SETUP, project], REPO, env);
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.deepEqual(snapshot(project), afterSetup);
});

test("--with-ci is opt-in, idempotent and leaves an existing pipeline untouched", async (t) => {
  await t.test("a missing pipeline is a managed optional file", (t) => {
    const { directory, project } = fixture(t);
    const env = commands(directory);
    const plain = run(process.execPath, [SETUP, project, "--plan"], REPO, env);
    assert.equal(plain.status, 0, plain.stderr);
    assert.equal(
      JSON.parse(plain.stdout).writes.some(
        (file) => file.path === ".gitlab-ci.yml",
      ),
      false,
    );
    const preview = run(
      process.execPath,
      [SETUP, project, "--plan", "--with-ci"],
      REPO,
      env,
    );
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(
      JSON.parse(preview.stdout).writes.some(
        (file) => file.path === ".gitlab-ci.yml",
      ),
      true,
    );
    const result = run(
      process.execPath,
      [SETUP, project, "--with-ci"],
      REPO,
      env,
    );
    assert.equal(result.status, 0, result.stderr);
    const ci = readFileSync(join(project, ".gitlab-ci.yml"), "utf8");
    assert.match(ci, /node:24-trixie/);
    assert.match(ci, /npm run verify/);
    assert.match(ci, /expire_in: 30 days/);
    assert.doesNotMatch(ci, /pas-staging|Tekton|FreeMarker/i);
    assert.ok(json(project, ".pas/harness/state.json").files[".gitlab-ci.yml"]);
    const before = snapshot(project);
    const rerun = run(process.execPath, [SETUP, project], REPO, env);
    assert.equal(rerun.status, 0, rerun.stderr);
    assert.deepEqual(snapshot(project), before);
  });
  await t.test("an existing pipeline remains human-owned", (t) => {
    const { directory, project } = fixture(t);
    const env = commands(directory);
    write(project, ".gitlab-ci.yml", "# Human pipeline\ninclude: team.yml\n");
    assert.equal(run("git", ["add", ".gitlab-ci.yml"], project).status, 0);
    assert.equal(
      run(
        "git",
        [
          "-c",
          "user.name=Harness Test",
          "-c",
          "user.email=harness@example.invalid",
          "commit",
          "--quiet",
          "-m",
          "pipeline",
        ],
        project,
      ).status,
      0,
    );
    const result = run(
      process.execPath,
      [SETUP, project, "--with-ci"],
      REPO,
      env,
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(join(project, ".gitlab-ci.yml"), "utf8"),
      "# Human pipeline\ninclude: team.yml\n",
    );
    assert.equal(
      json(project, ".pas/harness/state.json").files[".gitlab-ci.yml"],
      undefined,
    );
  });
});

test("each failed child stage stops installation and records its failure without claiming rollback", async (t) => {
  const stages = [
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    ["exec", "--no", "--", "husky"],
    ["exec", "--no", "--", "pas-link-skills"],
    ["run", "verify"],
  ];
  for (const [index, stage] of stages.entries())
    await t.test(stage.join(" "), (t) => {
      const { directory, project } = fixture(t);
      const env = { ...commands(directory), HARNESS_FAIL: stage.join(" ") };

      const result = run(process.execPath, [SETUP, project], REPO, env);

      assert.equal(result.status, 1);
      assert.match(result.stderr, /Command failed/);
      assert.match(result.stderr, /Partial installation.*no rollback/);
      const state = json(project, ".pas/harness/state.json");
      assert.equal(state.status, "failed");
      assert.equal(state.commands.length, index + 1);
      assert.equal(state.commands.at(-1).status, "failed");
      assert.equal(state.commands.at(-1).exitCode, 71);
      assert.deepEqual(state.commands.at(-1).command, ["npm", ...stage]);
      assert.equal(
        readFileSync(env.HARNESS_TRACE, "utf8").trim().split("\n").length,
        index + 1,
      );
    });
});

test("local edits to managed configuration and instruction blocks are conflicts before writes", async (t) => {
  const cases = [
    {
      name: "dependency field",
      path: "package.json",
      message: /package\.json.*skills/i,
      edit: (project) => {
        const pkg = json(project, "package.json");
        pkg.devDependencies.skills = "9.0.0";
        write(project, "package.json", `${JSON.stringify(pkg, null, 2)}\n`);
      },
    },
    {
      name: "managed skill pin",
      path: ".pas/skills-sources.json",
      message: /skills-sources\.json/i,
      edit: (project) => {
        const manifest = json(project, ".pas/skills-sources.json");
        manifest.sources = manifest.sources.map((source) =>
          source.replace("6fd947921b935b7e1e69293a200400f0fdd5c15f", "main"),
        );
        write(
          project,
          ".pas/skills-sources.json",
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
      },
    },
    {
      name: "managed source precedence",
      path: ".pas/skills-sources.json",
      message: /skills-sources\.json/i,
      edit: (project) => {
        const manifest = json(project, ".pas/skills-sources.json");
        manifest.sources.reverse();
        write(
          project,
          ".pas/skills-sources.json",
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
      },
    },
    {
      name: "Claude lint hook",
      path: ".claude/settings.json",
      message: /\.claude\/settings\.json/i,
      edit: (project) => {
        const settings = json(project, ".claude/settings.json");
        settings.hooks.PostToolUse.at(-1).matcher = "HumanOverride";
        write(
          project,
          ".claude/settings.json",
          `${JSON.stringify(settings, null, 2)}\n`,
        );
      },
    },
    {
      name: "OpenCode permission",
      path: "opencode.jsonc",
      message: /opencode\.jsonc/i,
      edit: (project) => {
        const config = readFileSync(join(project, "opencode.jsonc"), "utf8");
        write(
          project,
          "opencode.jsonc",
          config.replace('"effect": "deny"', '"effect": "allow"'),
        );
      },
    },
    {
      name: "activation block",
      path: "AGENTS.md",
      message: /AGENTS\.md/i,
      edit: (project) =>
        write(
          project,
          "AGENTS.md",
          readFileSync(join(project, "AGENTS.md"), "utf8").replace(
            "## Workflow",
            "## Human workflow",
          ),
        ),
    },
  ];
  for (const scenario of cases)
    await t.test(scenario.name, (t) => {
      const { directory, project } = fixture(t);
      const env = commands(directory);
      assert.equal(
        run(process.execPath, [SETUP, project], REPO, env).status,
        0,
      );
      scenario.edit(project);
      assert.equal(run("git", ["add", "."], project).status, 0);
      assert.equal(
        run(
          "git",
          [
            "-c",
            "user.name=Harness Test",
            "-c",
            "user.email=harness@example.invalid",
            "commit",
            "--quiet",
            "-m",
            "local edit",
          ],
          project,
        ).status,
        0,
      );
      const before = snapshot(project);
      const trace = readFileSync(env.HARNESS_TRACE, "utf8");
      const result = run(
        process.execPath,
        [SETUP, project, "--plan"],
        REPO,
        env,
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, /conflict/i);
      assert.match(result.stderr, scenario.message);
      assert.deepEqual(snapshot(project), before);
      assert.equal(readFileSync(env.HARNESS_TRACE, "utf8"), trace);
    });
});

test("a failed installation can resume its recorded changes, but not unrelated uncommitted work", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const failed = run(process.execPath, [SETUP, project], REPO, {
    ...env,
    HARNESS_FAIL: "exec --no -- pas-link-skills",
  });
  assert.equal(failed.status, 1);
  const before = snapshot(project);

  const preview = run(process.execPath, [SETUP, project, "--plan"], REPO, env);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).operation, "resume");
  assert.deepEqual(snapshot(project), before);
  write(project, "human-notes.md", "Do not include this in recovery.\n");
  const withNotes = snapshot(project);
  const blocked = run(process.execPath, [SETUP, project], REPO, env);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /uncommitted/i);
  assert.deepEqual(snapshot(project), withNotes);
  rmSync(join(project, "human-notes.md"));

  const recovered = run(process.execPath, [SETUP, project], REPO, env);
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(json(project, ".pas/harness/state.json").status, "installed");
  assert.ok(
    json(project, ".pas/harness/state.json").commands.every(
      (command) => command.status === "passed",
    ),
  );
});

test("a self-contained source snapshot updates owned files and records provenance without resetting project choices", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  const source = sharedSnapshot(directory);
  const setup = join(source, "harness/pas/setup.mjs");
  assert.equal(
    run(process.execPath, [setup, project], directory, env).status,
    0,
  );
  write(
    project,
    "docs/agents/issue-tracker.md",
    "# Tracker\nUse the configured external tracker.\n",
  );
  write(
    project,
    "AGENTS.md",
    `Human-owned preamble.\n\n${readFileSync(join(project, "AGENTS.md"), "utf8")}`,
  );
  const manifest = json(project, ".pas/skills-sources.json");
  manifest.agents = ["universal"];
  manifest.team = "keep";
  write(
    project,
    ".pas/skills-sources.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  assert.equal(run("git", ["add", "."], project).status, 0);
  assert.equal(
    run(
      "git",
      [
        "-c",
        "user.name=Harness Test",
        "-c",
        "user.email=harness@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "installed and configured",
      ],
      project,
    ).status,
    0,
  );
  const profile = json(source, "harness/pas/profile.json");
  profile.version = 2;
  write(
    source,
    "harness/pas/profile.json",
    `${JSON.stringify(profile, null, 2)}\n`,
  );
  const runtime = readFileSync(
    join(source, "harness/pas/payload/tools/verify.mjs"),
    "utf8",
  );
  write(
    source,
    "harness/pas/payload/tools/verify.mjs",
    `${runtime}\n// Updated source snapshot.\n`,
  );

  const before = snapshot(project);
  const preview = run(
    process.execPath,
    [setup, project, "--plan"],
    directory,
    env,
  );
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.operation, "update");
  assert.ok(
    plan.writes.some((file) => file.path === ".pas/harness/state.json"),
  );
  assert.deepEqual(snapshot(project), before);
  const updated = run(process.execPath, [setup, project], directory, env);

  assert.equal(updated.status, 0, updated.stderr);
  assert.match(
    readFileSync(join(project, "tools/verify.mjs"), "utf8"),
    /Updated source snapshot/,
  );
  assert.match(
    readFileSync(join(project, "AGENTS.md"), "utf8"),
    /^Human-owned preamble/,
  );
  assert.equal(
    readFileSync(join(project, "docs/agents/issue-tracker.md"), "utf8"),
    "# Tracker\nUse the configured external tracker.\n",
  );
  assert.deepEqual(json(project, ".pas/skills-sources.json").agents, [
    "universal",
  ]);
  assert.equal(json(project, ".pas/skills-sources.json").team, "keep");
  const state = json(project, ".pas/harness/state.json");
  assert.equal(state.profileVersion, 2);
  assert.match(state.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(state.source.revision, null);
  assert.deepEqual(state.source, plan.source);
  const installed = snapshot(project);
  assert.equal(
    run(process.execPath, [setup, project], directory, env).status,
    0,
  );
  assert.deepEqual(snapshot(project), installed);
});

test("the installed verify command writes evidence at the consumer root from a nested working directory", (t) => {
  const { directory, project } = fixture(t);
  assert.equal(
    run(process.execPath, [SETUP, project], REPO, commands(directory)).status,
    0,
  );
  const nested = join(project, "packages/example/src");
  mkdirSync(nested, { recursive: true });
  const commit = run("git", ["rev-parse", "HEAD"], project).stdout.trim();

  const result = run(
    process.execPath,
    [join(project, "tools/verify.mjs")],
    nested,
    {
      VERIFY_SKIP: "format,lint,typecheck,test,build,tracker",
      VERIFY_ADVISORY: "",
    },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const evidence = json(project, ".verify/evidence.json");
  assert.equal(evidence.commit, commit);
  assert.equal(
    evidence.steps.find((step) => step.name === "instructions").exitCode,
    0,
  );
  assert.equal(evidence.steps.filter((step) => step.skipped).length, 6);
  assert.equal(readdirSync(nested).includes(".verify"), false);
});

test("verify distinguishes full verification from skips, advisory failures and required failures", async (t) => {
  for (const scenario of [
    {
      name: "skipped steps",
      skip: "format,lint,typecheck,test,build,tracker",
      advisory: "",
      exit: 0,
      label: "PARTIAL",
      step: "format",
      status: "skipped",
    },
    {
      name: "advisory failure",
      skip: "lint,typecheck,test,build,tracker",
      advisory: "format",
      exit: 0,
      label: "PARTIAL",
      step: "format",
      status: "advisory-failure",
    },
    {
      name: "required failure",
      skip: "lint,typecheck,test,build,tracker",
      advisory: "",
      exit: 1,
      label: "FAIL",
      step: "format",
      status: "failed",
    },
  ])
    await t.test(scenario.name, (t) => {
      const { directory, project } = fixture(t);
      const env = commands(directory);
      assert.equal(
        run(process.execPath, [SETUP, project], REPO, env).status,
        0,
      );
      write(
        directory,
        "bin/npx",
        '#!/bin/sh\nprintf "deliberate formatter failure\\n"\nexit 71\n',
      );
      chmodSync(join(directory, "bin/npx"), 0o755);

      const result = run(
        process.execPath,
        [join(project, "tools/verify.mjs")],
        project,
        {
          ...env,
          VERIFY_SKIP: scenario.skip,
          VERIFY_ADVISORY: scenario.advisory,
        },
      );

      assert.equal(result.status, scenario.exit, result.stderr);
      const evidence = json(project, ".verify/evidence.json");
      assert.equal(evidence.passed, scenario.exit === 0);
      assert.equal(evidence.fullyVerified, false);
      assert.equal(
        evidence.steps.find((step) => step.name === scenario.step).status,
        scenario.status,
      );
      assert.match(result.stdout, new RegExp(`verify: ${scenario.label}`));
    });
});

test("verify attributes test counts to command output and does not report old coverage as current", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  write(
    project,
    "coverage/old/coverage-summary.json",
    '{"total":{"lines":{"pct":17}}}\n',
  );
  write(
    directory,
    "bin/npx",
    `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
if (!process.argv.includes('test')) process.exit(91);
mkdirSync('coverage/current', { recursive: true });
writeFileSync('coverage/current/coverage-summary.json', '{"total":{"lines":{"pct":82}}}');
process.stdout.write('Test Suites: 80 passed, 80 total\\nTests: 1009 passed, 1009 total\\n');
`,
  );
  chmodSync(join(directory, "bin/npx"), 0o755);

  const result = run(
    process.execPath,
    [join(project, "tools/verify.mjs")],
    project,
    {
      ...env,
      VERIFY_SKIP: "format,lint,typecheck,build,tracker",
      VERIFY_ADVISORY: "",
    },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const step = json(project, ".verify/evidence.json").steps.find(
    (entry) => entry.name === "test",
  );
  assert.deepEqual(step.tests, { suites: 80, tests: 1009, failed: 0 });
  assert.equal(step.testExecution, "nx-cache-allowed");
  assert.deepEqual(step.coverage, { current: { lines: 82 } });
  assert.equal(step.coverageArtifacts.old.status, "preexisting");
  assert.equal(step.coverageArtifacts.current.status, "created-or-updated");
  assert.match(step.coverageArtifacts.current.sha256, /^[a-f0-9]{64}$/);
});

test("verify reports missing test summaries as unreported rather than zero passing tests", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  write(
    directory,
    "bin/npx",
    '#!/bin/sh\nprintf "No projects with the test target were found.\\n"\n',
  );
  chmodSync(join(directory, "bin/npx"), 0o755);

  const result = run(
    process.execPath,
    [join(project, "tools/verify.mjs")],
    project,
    {
      ...env,
      VERIFY_SKIP: "format,lint,typecheck,build,tracker",
      VERIFY_ADVISORY: "",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const step = json(project, ".verify/evidence.json").steps.find(
    (entry) => entry.name === "test",
  );
  assert.equal(step.tests, null);
  assert.equal(step.testCountsStatus, "unreported");
  assert.doesNotMatch(result.stdout, /0 tests in 0 suites/);
});

test("installed typecheck uses consumer configs and exclusions from a nested directory and propagates failure", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  write(project, "packages/example/tsconfig.lib.json", "{}\n");
  write(project, "packages/example/tsconfig.spec.json", "{}\n");
  write(
    project,
    "tools/typecheck-exclude.json",
    '{"packages/example/tsconfig.spec.json":"Human-owned exclusion"}\n',
  );
  write(
    directory,
    "bin/npx",
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.TYPECHECK_TRACE, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
process.stdout.write('deliberate type error\\n');
process.exit(7);
`,
  );
  chmodSync(join(directory, "bin/npx"), 0o755);
  const nested = join(project, "packages/example");
  const trace = join(directory, "typecheck.jsonl");

  const result = run(
    process.execPath,
    [join(project, "tools/typecheck.mjs")],
    nested,
    {
      ...env,
      TYPECHECK_TRACE: trace,
    },
  );

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Human-owned exclusion/);
  assert.match(result.stdout, /deliberate type error/);
  const calls = readFileSync(trace, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, project);
  assert.ok(
    calls[0].args.includes(join(project, "packages/example/tsconfig.lib.json")),
  );
  assert.ok(calls[0].args.includes("--noEmit"));
  assert.deepEqual(json(project, "tools/typecheck-exclude.json"), {
    "packages/example/tsconfig.spec.json": "Human-owned exclusion",
  });
});

test("installed tracker-lint honors the consumer tracker choice from a nested directory", (t) => {
  const { directory, project } = fixture(t);
  assert.equal(
    run(process.execPath, [SETUP, project], REPO, commands(directory)).status,
    0,
  );
  write(
    project,
    "docs/agents/issue-tracker.md",
    "# Tracker\nUse local Markdown under `.scratch/`.\n",
  );
  write(
    project,
    ".scratch/example/issues/01-task.md",
    "# Task\nStatus: resolved\n\n- [ ] Not finished\n",
  );
  const nested = join(project, "packages/example");
  mkdirSync(nested, { recursive: true });
  const command = join(project, "tools/tracker-lint.mjs");

  const local = run(process.execPath, [command], nested);

  assert.equal(local.status, 1, local.stderr);
  assert.match(local.stdout, /resolved with 1 unchecked/);
  write(
    project,
    "docs/agents/issue-tracker.md",
    "# Tracker\nUse GitLab issues.\n",
  );
  const external = run(process.execPath, [command], nested);
  assert.equal(external.status, 0, external.stderr);
  assert.match(external.stdout, /nothing to check/);
});

test("the installed edit-lint command resolves relative files from the caller and rejects escapes", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  write(project, "packages/example/edited.ts", "const value = 1;\n");
  write(project, "..internal.ts", "const value = 2;\n");
  write(directory, "outside.ts", "const secret = 3;\n");
  symlinkSync(join(directory, "outside.ts"), join(project, "escape.ts"));
  write(
    directory,
    "bin/npx",
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.LINT_TRACE, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
process.stdout.write('deliberate lint error\\n');
process.exit(7);
`,
  );
  chmodSync(join(directory, "bin/npx"), 0o755);
  const trace = join(directory, "lint.jsonl");
  const command = join(project, "tools/agent-hooks/lint-edited-file.mjs");
  const nested = join(project, "packages/example");

  const result = run(process.execPath, [command, "edited.ts"], nested, {
    ...env,
    LINT_TRACE: trace,
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /deliberate lint error/);
  const internal = run(process.execPath, [command, "..internal.ts"], project, {
    ...env,
    LINT_TRACE: trace,
  });
  assert.equal(internal.status, 1, internal.stderr);
  for (const file of ["escape.ts", "../outside.ts"]) {
    assert.equal(
      run(process.execPath, [command, file], project, {
        ...env,
        LINT_TRACE: trace,
      }).status,
      0,
    );
  }
  const calls = readFileSync(trace, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.cwd === project));
  assert.deepEqual(calls[0].args.slice(0, 2), ["--no", "eslint"]);
  assert.equal(calls[0].args.at(-1), "packages/example/edited.ts");
  assert.equal(calls[1].args.at(-1), "..internal.ts");
});

test("the installed OpenCode adapter lints every patched file at a nested location", (t) => {
  const { directory, project } = fixture(t);
  const env = commands(directory);
  assert.equal(run(process.execPath, [SETUP, project], REPO, env).status, 0);
  write(project, "packages/example/one.ts", "const one = 1;\n");
  write(project, "packages/example/two.ts", "const two = 2;\n");
  write(
    directory,
    "bin/npx",
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.LINT_TRACE, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
process.stdout.write('lint error in ' + process.argv.at(-1) + '\\n');
process.exit(7);
`,
  );
  chmodSync(join(directory, "bin/npx"), 0o755);
  write(
    directory,
    "consume-plugin.mjs",
    `import { pathToFileURL } from 'node:url';
const { default: plugin } = await import(pathToFileURL(process.env.CONSUMER_PLUGIN));
let after;
await plugin.setup({ location: { directory: process.cwd() }, tool: { hook: async (name, callback) => {
  if (name !== 'execute.after') throw new Error('Unexpected registration');
  after = callback;
} } });
const event = { status: 'completed', tool: 'patch', input: { patchText: '*** Begin Patch\\n*** Update File: one.ts\\n@@\\n-old\\n+new\\n*** Add File: two.ts\\n+new\\n*** End Patch' }, result: { content: [{ type: 'text', text: 'Original tool result' }] } };
await after(event);
process.stdout.write(JSON.stringify(event.result));
`,
  );
  const trace = join(directory, "lint.jsonl");

  const result = run(
    process.execPath,
    [join(directory, "consume-plugin.mjs")],
    join(project, "packages/example"),
    {
      ...env,
      LINT_TRACE: trace,
      CONSUMER_PLUGIN: join(project, ".opencode/plugins/lint-edited-file.ts"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout).content;
  assert.equal(output[0].text, "Original tool result");
  assert.match(
    JSON.stringify(output),
    /lint error in packages\/example\/one\.ts/,
  );
  assert.match(
    JSON.stringify(output),
    /lint error in packages\/example\/two\.ts/,
  );
  const calls = readFileSync(trace, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.cwd === project));
});

test("the installed typecheck command accepts an empty PAS scaffold without inventing checked projects", (t) => {
  const { directory, project } = fixture(t);
  assert.equal(
    run(process.execPath, [SETUP, project], REPO, commands(directory)).status,
    0,
  );

  const result = run(
    process.execPath,
    [join(project, "tools/typecheck.mjs")],
    directory,
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no project tsconfigs/i);
});

test("the installed cycle helper accepts an explicit executable path and cleans its temporary root config", (t) => {
  const { directory, project } = fixture(t);
  assert.equal(
    run(process.execPath, [SETUP, project], REPO, commands(directory)).status,
    0,
  );
  write(project, "packages/example/src/index.ts", "export const value = 1;\n");
  write(
    project,
    "tsconfig.base.json",
    '{"compilerOptions":{"paths":{"@example/*":["packages/example/*"]}}}\n',
  );
  write(
    directory,
    "explicit tools/arch4ts",
    `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
if (config.extends !== './tsconfig.base.json') process.exit(81);
writeFileSync(process.argv[process.argv.indexOf('--out') + 1], JSON.stringify({architecture:{graph:{nodes:['a','b'],edges:[{}]}},layering:{cycles:[['a','b','a']],feedbackEdges:[{from:'b',to:'a',lines:[2]}]}}));
`,
  );
  chmodSync(join(directory, "explicit tools/arch4ts"), 0o755);
  const before = snapshot(project);
  const script = join(
    project,
    ".pas/harness/skills/arch-cycles/scripts/arch-cycles.sh",
  );

  const result = run("/bin/bash", [script], join(project, "packages/example"), {
    ARCH4TS_BIN: join(directory, "explicit tools/arch4ts"),
    TMPDIR: directory,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /modules: 2.*imports: 1.*cycles: 1.*feedback edges: 1/,
  );
  assert.match(result.stdout, /cycle: a -> b -> a/);
  assert.match(result.stdout, /feedback edge: b -> a \(line 2\)/);
  assert.deepEqual(snapshot(project), before);
});

test("missing cycle tooling is an informational skip, not an implicit neighboring-checkout dependency", (t) => {
  const { directory, project } = fixture(t);
  assert.equal(
    run(process.execPath, [SETUP, project], REPO, commands(directory)).status,
    0,
  );
  write(project, "packages/example/src/index.ts", "export const value = 1;\n");
  write(project, ".pas/arch4ts/dist/cli.js", "process.exit(99);\n");
  mkdirSync(join(directory, "probe-bin"));
  for (const command of ["git", "dirname", "jq", "rm"])
    symlinkSync(`/usr/bin/${command}`, join(directory, "probe-bin", command));
  symlinkSync(process.execPath, join(directory, "probe-bin/node"));
  const before = snapshot(project);

  const result = run(
    "/bin/bash",
    [join(project, ".pas/harness/skills/arch-cycles/scripts/arch-cycles.sh")],
    project,
    { ARCH4TS_BIN: "", PATH: join(directory, "probe-bin"), TMPDIR: directory },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /arch4ts not found.*skipping cycle data/);
  assert.deepEqual(snapshot(project), before);
});

test("unsafe targets and unknown flags are rejected without writes", async (t) => {
  const cases = [
    {
      name: "dirty checkout",
      prepare: ({ project }) => {
        write(project, "notes.md", "uncommitted human work\n");
        return project;
      },
      message: /clean|dirty|uncommitted/i,
    },
    {
      name: "not a Git repository",
      prepare: ({ project }) => {
        rmSync(join(project, ".git"), { recursive: true });
        return project;
      },
      message: /git repository/i,
    },
    {
      name: "nested project rather than workspace root",
      prepare: ({ project }) => {
        const nested = join(project, "nested");
        write(nested, "package.json", "{}");
        write(nested, "nx.json", "{}");
        write(nested, ".pas/skills-sources.json", '{"sources":[]}');
        return nested;
      },
      message: /root/i,
    },
    {
      name: "symlinked target",
      prepare: ({ directory, project }) => {
        const link = join(directory, "project-link");
        symlinkSync(project, link);
        return link;
      },
      message: /symlink/i,
    },
    {
      name: "symlinked write destination",
      prepare: ({ directory, project }) => {
        const outside = join(directory, "outside");
        mkdirSync(outside);
        symlinkSync(outside, join(project, "tools"));
        return project;
      },
      message: /symlink/i,
    },
    {
      name: "unrecognized force flag",
      prepare: ({ project }) => project,
      flags: ["--force"],
      message: /unknown.*--force/i,
    },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, (t) => {
      const context = fixture(t);
      const target = scenario.prepare(context);
      const before = snapshot(context.directory);
      const result = run(
        process.execPath,
        [SETUP, target, "--plan", ...(scenario.flags ?? [])],
        REPO,
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, scenario.message);
      assert.deepEqual(snapshot(context.directory), before);
    });
  }
});
