import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENABLED = process.env.HARNESS_REAL_LINKING === "1";

test(
  "the actual PAS wrapper installs complete shared skills, preserves unrelated skills and honors local overrides",
  { skip: !ENABLED, timeout: 240_000 },
  (t) => {
    assert.ok(
      process.env.PAS_GUIDELINES_DIR,
      "Set PAS_GUIDELINES_DIR to an installed @pas/dev-guidelines 26.1.0 directory.",
    );
    const directory = mkdtempSync("/tmp/opencode/harness-pas-linking-");
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const project = join(directory, "project");
    const home = join(directory, "home");
    mkdirSync(project);
    mkdirSync(home);
    const env = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) => !name.startsWith("OPENCODE_"),
        ),
      ),
      HOME: home,
      XDG_CONFIG_HOME: join(home, ".config"),
      XDG_DATA_HOME: join(home, ".local/share"),
      XDG_CACHE_HOME: join(home, ".cache"),
      XDG_STATE_HOME: join(home, ".local/state"),
      HUSKY: "0",
      NX_DAEMON: "false",
      DISABLE_TELEMETRY: "1",
      GIT_OPTIONAL_LOCKS: "0",
      npm_config_cache: join(directory, "npm-cache"),
      // This fixture checks provisioning and skill linking, not an Nx application.
      VERIFY_SKIP: "format,lint,typecheck,test,build,tracker",
    };
    function write(path, content) {
      mkdirSync(dirname(join(project, path)), { recursive: true });
      writeFileSync(join(project, path), content);
    }
    function run(command, args, cwd = project) {
      const result = spawnSync(command, args, {
        cwd,
        env,
        encoding: "utf8",
        timeout: 180_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      assert.equal(
        result.status,
        0,
        `${command} ${args.join(" ")}\n${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`,
      );
      return result.stdout;
    }
    cpSync(
      process.env.PAS_GUIDELINES_DIR,
      join(project, ".test-deps/pas-dev-guidelines"),
      { recursive: true },
    );
    write(
      "package.json",
      JSON.stringify(
        {
          name: "harness-linking-fixture",
          private: true,
          scripts: { postinstall: "pas-link-skills" },
          devDependencies: {
            "@pas/dev-guidelines": "file:.test-deps/pas-dev-guidelines",
            tslib: "2.8.1",
          },
        },
        null,
        2,
      ),
    );
    write("nx.json", "{}\n");
    write(".gitignore", "node_modules/\n.verify/\n");
    write(
      ".pas/skills-sources.json",
      JSON.stringify(
        {
          agents: ["claude-code", "junie", "universal"],
          sources: ["./node_modules/@pas/dev-guidelines", "./.pas/skills"],
          gitignore: false,
        },
        null,
        2,
      ),
    );
    const local =
      "---\nname: pattern-decision\ndescription: Use for the explicit local fixture override.\n---\n\n# Human local override\n";
    const unrelated =
      "---\nname: unrelated\ndescription: Use for the unrelated fixture capability.\n---\n\n# Keep this skill\n";
    write(".agents/skills/unrelated/SKILL.md", unrelated);
    run("git", ["init", "--quiet"]);
    run("git", ["add", "."]);
    run("git", [
      "-c",
      "user.name=Harness Test",
      "-c",
      "user.email=harness@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ]);

    run(process.execPath, [join(REPO, "harness/pas/setup.mjs"), project]);

    for (const path of [".agents/skills", ".claude/skills", ".junie/skills"]) {
      for (const file of [
        "SKILL.md",
        "FORCE-INDEX.md",
        "INTERVIEW-FORMAT.md",
      ]) {
        assert.equal(
          readFileSync(join(project, path, "pattern-decision", file), "utf8"),
          readFileSync(join(REPO, "skills/pattern-decision", file), "utf8"),
        );
      }
    }
    write("packages/example/src/example.ts", "export const ANSWER = 42;\n");
    run(
      process.execPath,
      [join(project, "tools/agent-hooks/lint-edited-file.mjs"), "example.ts"],
      join(project, "packages/example/src"),
    );
    run("npm", [
      "exec",
      "--no",
      "--",
      "eslint",
      "--flag",
      "v10_config_lookup_from_file",
      "--format",
      "./tools/eslint/agent-formatter.cjs",
      "packages/example/src/example.ts",
    ]);
    write(
      "packages/example/src/example.ts",
      "export const ANSWER = 42;\nconsole.log(ANSWER);\n",
    );
    const lint = spawnSync(
      "npm",
      [
        "exec",
        "--no",
        "--",
        "eslint",
        "--flag",
        "v10_config_lookup_from_file",
        "--format",
        "./tools/eslint/agent-formatter.cjs",
        "packages/example/src/example.ts",
      ],
      { cwd: project, env, encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(lint.status, 1, `${lint.stdout}\n${lint.stderr}`);
    assert.match(lint.stdout, /no-console/);
    assert.match(lint.stdout, /injectLogger/);
    const editLint = spawnSync(
      process.execPath,
      [join(project, "tools/agent-hooks/lint-edited-file.mjs"), "example.ts"],
      {
        cwd: join(project, "packages/example/src"),
        env,
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    assert.equal(editLint.status, 1, `${editLint.stdout}\n${editLint.stderr}`);
    assert.match(editLint.stdout, /no-console/);
    assert.match(editLint.stdout, /injectLogger/);
    if (process.env.HARNESS_OPENCODE === "1") {
      const nested = join(project, "packages/example/src");
      mkdirSync(nested, { recursive: true });
      write(
        ".opencode/skills/native-probe/SKILL.md",
        "---\nname: native-probe\ndescription: Native discovery diagnostic fixture.\n---\n\n# Native probe\n",
      );
      const api = (args) =>
        run("opencode", ["api", "--standalone", ...args], nested);
      const session = JSON.parse(
        api([
          "post",
          "/api/session",
          "--data",
          JSON.stringify({
            title: "Disposable harness activation proof",
            location: { directory: nested },
          }),
        ]),
      ).data;
      api(["get", `/api/session/${session.id}/context`]);
      const discovery = JSON.parse(api(["get", "/api/skill"]));
      const location = JSON.parse(api(["get", "/api/location"]));
      const rootDiscovery = JSON.parse(
        run("opencode", ["api", "--standalone", "get", "/api/skill"]),
      );
      // A minimal independent project distinguishes a runtime bootstrap problem
      // from the harness configuration or its edit plugin.
      const control = join(directory, "native-control");
      mkdirSync(join(control, ".opencode/skills"), { recursive: true });
      cpSync(
        join(project, ".opencode/skills/native-probe"),
        join(control, ".opencode/skills/native-probe"),
        { recursive: true },
      );
      run("git", ["init", "--quiet"], control);
      const controlDiscovery = JSON.parse(
        run("opencode", ["api", "--standalone", "get", "/api/skill"], control),
      );
      const plugins = JSON.parse(api(["get", "/api/plugin"]));
      const agents = JSON.parse(api(["get", "/api/agent"]));
      for (const id of [
        "pattern-decision",
        "grilling",
        "improve-codebase-architecture",
        "enforcing-quality-gates",
      ]) {
        const skill = discovery.data.find((entry) => entry.id === id);
        assert.ok(
          skill,
          `Native nested discovery must advertise ${id}: ${JSON.stringify({ location, rootSkills: rootDiscovery.data.map(({ id, path }) => ({ id, path })), skills: discovery.data.map(({ id, path }) => ({ id, path })), controlSkills: controlDiscovery.data, plugins, agents })}`,
        );
        assert.ok(skill.path.startsWith(project), skill.path);
        assert.ok(
          skill.content.includes(
            readFileSync(join(REPO, "skills", id, "SKILL.md"), "utf8")
              .split("---\n")
              .at(-1)
              .trim(),
          ),
        );
      }
      api([
        "post",
        `/api/experimental/session/${session.id}/skill`,
        "--data",
        '{"id":"pattern-decision","resume":false}',
      ]);
      const context = JSON.parse(
        api(["get", `/api/session/${session.id}/context`]),
      ).data;
      const activated = context.find(
        (entry) => entry.type === "skill" && entry.skill === "pattern-decision",
      );
      assert.ok(
        activated,
        "The actual runtime must load the project skill without model inference.",
      );
      assert.match(activated.text, /INTERVIEW-FORMAT\.md/);
      assert.match(activated.text, /FORCE-INDEX\.md/);
      assert.match(
        JSON.stringify(context),
        /Quality gates before structural review/,
      );
    }
    write(".pas/skills/pattern-decision/SKILL.md", local);
    run("npm", ["exec", "--no", "--", "pas-link-skills"]);

    for (const path of [".agents/skills", ".claude/skills", ".junie/skills"]) {
      assert.equal(
        readFileSync(join(project, path, "pattern-decision/SKILL.md"), "utf8"),
        local,
        path,
      );
      for (const skill of [
        "grilling",
        "improve-codebase-architecture",
        "pas-generate-code",
        "pas-code-review",
        "pas-spec-driven-development",
        "pas-specupdate",
        "arch-cycles",
        "arch-report-mermaid",
        "enforcing-quality-gates",
        "pattern-review",
      ]) {
        assert.equal(
          readFileSync(join(project, path, skill, "SKILL.md"), "utf8"),
          readFileSync(join(REPO, "skills", skill, "SKILL.md"), "utf8"),
          `${path}/${skill}`,
        );
      }
      assert.equal(
        readFileSync(
          join(project, path, "improve-codebase-architecture/HTML-REPORT.md"),
          "utf8",
        ),
        readFileSync(
          join(REPO, "skills/improve-codebase-architecture/HTML-REPORT.md"),
          "utf8",
        ),
      );
      assert.ok(
        readFileSync(
          join(
            project,
            path,
            "arch-report-mermaid/scripts/validate-mermaid.mjs",
          ),
        ).length,
      );
    }
    assert.equal(
      readFileSync(join(project, ".agents/skills/unrelated/SKILL.md"), "utf8"),
      unrelated,
    );
    assert.match(
      run("npm", ["exec", "--no", "--", "skills", "--version"]),
      /1\.7\.2/,
    );
    run("npm", ["install", "--no-audit", "--no-fund"]);
    assert.equal(
      readFileSync(
        join(project, ".agents/skills/pattern-decision/SKILL.md"),
        "utf8",
      ),
      local,
    );
    assert.equal(
      readFileSync(join(project, ".agents/skills/grilling/SKILL.md"), "utf8"),
      readFileSync(join(REPO, "skills/grilling/SKILL.md"), "utf8"),
    );
    assert.equal(
      readFileSync(join(project, ".agents/skills/unrelated/SKILL.md"), "utf8"),
      unrelated,
    );
  },
);
