import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
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
const REAL = process.env.HARNESS_REAL_STARTERS === "1";
const ENABLED = process.env.HARNESS_STARTER_SNAPSHOTS === "1" || REAL;
const PREPARE_README =
  REAL && process.env.HARNESS_PREPARE_STARTER_README === "1";

for (const [kind, variable] of [
  ["blank", "PAS_BLANK_STARTER"],
  ["configured", "PAS_CONFIGURED_STARTER"],
]) {
  test(
    `the actual ${kind} starter working snapshot preserves its human configuration${REAL ? " with real consumer commands" : ""}${PREPARE_README ? " after explicit fixture-only README repair" : ""}`,
    { skip: !ENABLED, timeout: 600_000 },
    (t) => {
      const source = process.env[variable];
      assert.ok(
        source,
        `Set ${variable} to the corresponding disposable-review starter checkout.`,
      );
      const directory = mkdtempSync("/tmp/opencode/harness-pas-starter-");
      t.after(() => {
        if (process.env.HARNESS_KEEP_FIXTURES === "1")
          t.diagnostic(`Fixture retained at ${directory}`);
        else rmSync(directory, { recursive: true, force: true });
      });
      const project = join(directory, "project");
      mkdirSync(project);
      const env = {
        ...process.env,
        HUSKY: REAL ? "1" : "0",
        GIT_OPTIONAL_LOCKS: "0",
        NX_DAEMON: "false",
        CI: "true",
      };
      if (REAL) {
        delete env.VERIFY_SKIP;
        delete env.VERIFY_ADVISORY;
      }
      const originalStatus = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        { cwd: source, env, encoding: "utf8" },
      ).stdout;
      const listing = spawnSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        { cwd: source, env, encoding: "utf8" },
      );
      assert.equal(listing.status, 0, listing.stderr);
      const originals = new Map();
      for (const path of new Set(listing.stdout.split("\0").filter(Boolean))) {
        assert.ok(!path.startsWith("../") && !path.startsWith("/"));
        mkdirSync(dirname(join(project, path)), { recursive: true });
        cpSync(join(source, path), join(project, path), { dereference: false });
        if (path === "CLAUDE.md" || path.startsWith("docs/agents/"))
          originals.set(path, readFileSync(join(source, path), "utf8"));
      }
      assert.ok(originals.has("CLAUDE.md"));
      const originalReadme = readFileSync(join(source, "README.md"), "utf8");
      if (kind === "configured")
        assert.ok(
          [...originals.keys()].some((path) => path.startsWith("docs/agents/")),
          "Include configured untracked docs, not just HEAD.",
        );
      if (!REAL) {
        mkdirSync(join(directory, "bin"));
        writeFileSync(join(directory, "bin/npm"), "#!/bin/sh\nexit 0\n");
        chmodSync(join(directory, "bin/npm"), 0o755);
        env.PATH = `${join(directory, "bin")}:${process.env.PATH}`;
      }
      const invoke = (command, args, extra = {}) =>
        spawnSync(command, args, {
          cwd: project,
          env: { ...env, ...extra },
          encoding: "utf8",
          timeout: 480_000,
          maxBuffer: 16 * 1024 * 1024,
        });
      const run = (command, args, extra) => {
        const result = invoke(command, args, extra);
        assert.equal(
          result.status,
          0,
          `${command}\n${result.stdout?.split("\n").slice(-85).join("\n")}\n${result.stderr?.split("\n").slice(-30).join("\n")}`,
        );
        return result.stdout;
      };
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
        "working snapshot",
      ]);
      const manifest = JSON.parse(
        readFileSync(join(project, ".pas/skills-sources.json"), "utf8"),
      );
      const setup = join(REPO, "harness/pas/setup.mjs");

      if (PREPARE_README) {
        const initial = invoke(process.execPath, [setup, project]);
        if (initial.status !== 0) {
          const evidence = JSON.parse(
            readFileSync(join(project, ".verify/evidence.json"), "utf8"),
          );
          assert.deepEqual(
            evidence.steps
              .filter((step) => step.status !== "passed")
              .map((step) => step.name),
            ["format"],
          );
          const log = readFileSync(
            join(project, ".verify/format.log"),
            "utf8",
          ).replace(/\u001b\[[0-9;]*m/g, "");
          const warnings = log
            .split("\n")
            .filter(
              (line) =>
                line.startsWith("[warn] ") &&
                !line.startsWith("[warn] Code style issues"),
            )
            .map((line) => line.slice(7));
          assert.deepEqual(
            warnings,
            ["README.md"],
            "Fixture preparation must not hide installer-owned formatting failures.",
          );
          assert.equal(
            readFileSync(join(project, "README.md"), "utf8"),
            originalReadme,
          );
          run("npm", [
            "exec",
            "--no",
            "--",
            "prettier",
            "--write",
            "README.md",
          ]);
          run("git", ["add", "."]);
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
              "chore: prepare disposable readme baseline",
            ],
            { HUSKY: "0" },
          );
          t.diagnostic(
            "Only the disposable README.md was explicitly repaired after proving the installer left it unchanged. Original starter files were not changed.",
          );
        }
      }
      const preparedReadme = readFileSync(join(project, "README.md"), "utf8");
      run(process.execPath, [setup, project]);
      if (REAL) {
        const evidence = JSON.parse(
          readFileSync(join(project, ".verify/evidence.json"), "utf8"),
        );
        assert.equal(
          evidence.fullyVerified,
          true,
          JSON.stringify(evidence.steps),
        );
        t.diagnostic(
          JSON.stringify({
            fixture: kind,
            commit: evidence.commit,
            fullyVerified: evidence.fullyVerified,
            testCountsStatus: evidence.steps.find(
              (step) => step.name === "test",
            )?.testCountsStatus,
          }),
        );
        assert.equal(
          run("git", ["config", "--local", "core.hooksPath"]).trim(),
          ".husky/_",
        );
        writeFileSync(
          join(project, "harness-hook-probe.md"),
          "# Installed hook probe\n",
        );
        run("git", ["add", "harness-hook-probe.md"]);
        const rejected = invoke("git", [
          "-c",
          "user.name=Harness Test",
          "-c",
          "user.email=harness@example.invalid",
          "commit",
          "-m",
          "invalid message",
        ]);
        assert.notEqual(
          rejected.status,
          0,
          "The installed commit-msg hook must reject a non-conventional message.",
        );
        assert.match(
          `${rejected.stdout}\n${rejected.stderr}`,
          /commit-msg|subject-empty|type-empty/,
        );
        run("git", [
          "-c",
          "user.name=Harness Test",
          "-c",
          "user.email=harness@example.invalid",
          "commit",
          "--quiet",
          "-m",
          "test: validate installed hooks",
        ]);
        assert.equal(
          run("git", ["log", "-1", "--format=%s"]).trim(),
          "test: validate installed hooks",
        );
        run("sh", [".husky/pre-push"]);
        assert.equal(
          JSON.parse(
            readFileSync(join(project, ".verify/evidence.json"), "utf8"),
          ).fullyVerified,
          true,
        );
        t.diagnostic(
          "Installed pre-commit and commit-msg hooks ran on disposable commits; the pre-push script ran without performing a push.",
        );
      }

      for (const [path, content] of originals) {
        const installed = readFileSync(join(project, path), "utf8");
        if (path === "CLAUDE.md") assert.ok(installed.startsWith(content));
        else assert.equal(installed, content, path);
      }
      assert.deepEqual(
        JSON.parse(
          readFileSync(join(project, ".pas/skills-sources.json"), "utf8"),
        ).agents,
        manifest.agents,
      );
      run(process.execPath, [join(project, "tools/instructions-lint.mjs")]);
      const preview = JSON.parse(
        run(process.execPath, [setup, project, "--plan"]),
      );
      assert.deepEqual(preview.writes, []);
      assert.deepEqual(preview.commands, []);
      const finalStatus = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        { cwd: source, env, encoding: "utf8" },
      ).stdout;
      assert.equal(
        finalStatus,
        originalStatus,
        "The original checkout must stay untouched.",
      );
      for (const [path, content] of originals)
        assert.equal(readFileSync(join(source, path), "utf8"), content);
      assert.equal(
        readFileSync(join(project, "README.md"), "utf8"),
        preparedReadme,
      );
      assert.equal(
        readFileSync(join(source, "README.md"), "utf8"),
        originalReadme,
      );
    },
  );
}
