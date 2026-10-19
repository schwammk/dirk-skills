import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test(
  "the consumer Mermaid command uses locked dependencies, checks every diagram and works offline after setup",
  { skip: process.env.HARNESS_REAL_MERMAID !== "1", timeout: 180_000 },
  (t) => {
    const directory = mkdtempSync("/tmp/opencode/harness-pas-mermaid-");
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const project = join(directory, "consumer");
    const scripts = join(
      project,
      ".pas/harness/skills/arch-report-mermaid/scripts",
    );
    cpSync(join(REPO, "skills/arch-report-mermaid/scripts"), scripts, {
      recursive: true,
    });
    const report = join(project, "report.html");
    const valid =
      '<pre class="mermaid">flowchart TD\n A["f(x)"] --&gt; B["Result"]\n</pre>\n';
    writeFileSync(
      report,
      `${valid}<pre class="mermaid">flowchart LR\n X -. "leak" .-&gt; Y\n</pre>\n`,
    );
    const home = join(directory, "home");
    mkdirSync(home);
    const env = {
      ...process.env,
      HOME: home,
      XDG_CACHE_HOME: join(home, ".cache"),
      npm_config_cache: join(directory, "npm-cache"),
      HUSKY: "0",
    };
    const run = (extra = {}) =>
      spawnSync(
        "/bin/bash",
        [join(scripts, "validate-mermaid.sh"), "report.html"],
        {
          cwd: project,
          env: { ...env, ...extra },
          encoding: "utf8",
          timeout: 120_000,
        },
      );

    const cold = run();
    assert.equal(cold.status, 0, `${cold.stdout}\n${cold.stderr}`);
    assert.match(cold.stdout, /2 diagrams, 0 with errors/);
    const cache = join(home, ".cache/dirk-skills/mermaid-check");
    const candidates = [
      cache,
      ...readdirSync(cache).map((name) => join(cache, name)),
    ];
    const installed = candidates.find((path) =>
      existsSync(join(path, "node_modules/mermaid/package.json")),
    );
    assert.ok(
      installed,
      "The documented validator cache contains its own runtime dependencies.",
    );
    assert.equal(
      JSON.parse(
        readFileSync(
          join(installed, "node_modules/mermaid/package.json"),
          "utf8",
        ),
      ).version,
      "11.17.2",
    );
    assert.equal(
      JSON.parse(
        readFileSync(
          join(installed, "node_modules/jsdom/package.json"),
          "utf8",
        ),
      ).version,
      "27.4.0",
    );
    assert.equal(existsSync(join(project, "node_modules")), false);

    const bin = join(directory, "offline-bin");
    mkdirSync(bin);
    const called = join(directory, "npm-called");
    writeFileSync(
      join(bin, "npm"),
      `#!/bin/sh\nprintf called > '${called}'\nexit 88\n`,
    );
    chmodSync(join(bin, "npm"), 0o755);
    const offline = { PATH: `${bin}:${process.env.PATH}` };
    writeFileSync(
      report,
      `${valid}<pre class="mermaid">flowchart TD\n A[f(x)]\n</pre>\n`,
    );
    const warm = run(offline);
    assert.equal(warm.status, 1, `${warm.stdout}\n${warm.stderr}`);
    assert.match(warm.stdout, /BAD diagram 2/);
    assert.match(warm.stdout, /2 diagrams, 1 with errors/);
    assert.equal(
      existsSync(called),
      false,
      "Warm validation must not invoke npm.",
    );

    const unavailable = run({
      ...offline,
      XDG_CACHE_HOME: join(directory, "empty-cache"),
    });
    assert.equal(
      unavailable.status,
      2,
      `${unavailable.stdout}\n${unavailable.stderr}`,
    );
    assert.match(unavailable.stderr, /setup|npm.*failed/i);
    assert.equal(existsSync(called), true);
  },
);
