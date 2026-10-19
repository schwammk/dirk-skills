#!/usr/bin/env node
// The repo's final check. Runs every sensor, prints one line per step (plus
// the log tail of a failing step) and records the outcome in
// .verify/evidence.json, so a ticket Resolution can cite evidence instead of
// a claim. Skip steps with VERIFY_SKIP=build,format; report steps without
// failing on them with VERIFY_ADVISORY=tracker.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const outDir = ".verify";
const skip = new Set(
  (process.env.VERIFY_SKIP ?? "").split(",").filter(Boolean),
);
const advisory = new Set(
  (process.env.VERIFY_ADVISORY ?? "").split(",").filter(Boolean),
);
const steps = [
  { name: "instructions", command: "node tools/instructions-lint.mjs" },
  { name: "format", command: "npx prettier -c ." },
  { name: "lint", command: "npx nx run-many -t lint" },
  { name: "typecheck", command: "node tools/typecheck.mjs" },
  {
    name: "test",
    command:
      "npx nx run-many -t test --coverage --coverageReporters=lcov --coverageReporters=json-summary",
  },
  { name: "build", command: "npx nx run-many -t build" },
  { name: "tracker", command: "node tools/tracker-lint.mjs" },
].map((step) => ({ ...step, advisory: advisory.has(step.name) }));

function git(...args) {
  return spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
}

function testCounts(log) {
  if (!/Test Suites:.*?\d+ total/.test(log) || !/Tests:.*?\d+ total/.test(log))
    return null;
  const counts = { suites: 0, tests: 0, failed: 0 };
  for (const [, suites] of log.matchAll(/Test Suites:.*?(\d+) total/g))
    counts.suites += +suites;
  for (const [line, tests] of log.matchAll(/Tests:.*?(\d+) total/g)) {
    counts.tests += +tests;
    counts.failed += +(/(\d+) failed/.exec(line)?.[1] ?? 0);
  }
  return counts;
}

function coverageArtifacts(dir = "coverage") {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir, { recursive: true })
      .filter((file) => file.endsWith("coverage-summary.json"))
      .map((file) => {
        const path = join(dir, file);
        const body = readFileSync(path, "utf8");
        const { total } = JSON.parse(body);
        const pct = Object.fromEntries(
          Object.entries(total).map(([k, v]) => [k, v.pct]),
        );
        return [
          file.replace(/\/coverage-summary\.json$/, ""),
          {
            pct,
            sha256: createHash("sha256").update(body).digest("hex"),
            mtimeMs: statSync(path).mtimeMs,
          },
        ];
      }),
  );
}

mkdirSync(outDir, { recursive: true });
const evidence = {
  commit: git("rev-parse", "HEAD"),
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  dirty: git("status", "--porcelain") !== "",
  startedAt: new Date().toISOString(),
  steps: [],
};

for (const step of steps) {
  if (skip.has(step.name)) {
    evidence.steps.push({ name: step.name, skipped: true, status: "skipped" });
    console.log(`skip ${step.name}`);
    continue;
  }
  const started = Date.now();
  const coverageBefore = step.name === "test" ? coverageArtifacts() : {};
  const logFile = join(outDir, `${step.name}.log`);
  // A file, not a pipe: Nx cuts piped output short when it exits.
  const fd = openSync(logFile, "w");
  const run = spawnSync(step.command, {
    shell: true,
    stdio: ["ignore", fd, fd],
  });
  closeSync(fd);
  const log = readFileSync(logFile, "utf8");
  const record = {
    name: step.name,
    command: step.command,
    exitCode: run.status,
    status:
      run.status === 0
        ? "passed"
        : step.advisory
          ? "advisory-failure"
          : "failed",
    ...(run.signal ? { signal: run.signal } : {}),
    ...(run.error ? { error: run.error.message } : {}),
    durationMs: Date.now() - started,
    log: logFile,
    ...(step.advisory && { advisory: true }),
  };
  if (step.name === "test") {
    record.tests = testCounts(log);
    record.testCountsStatus = record.tests ? "reported" : "unreported";
    record.testExecution = "nx-cache-allowed";
    const artifacts = coverageArtifacts();
    record.coverageArtifacts = Object.fromEntries(
      Object.entries(artifacts).map(([path, artifact]) => {
        const before = coverageBefore[path];
        const status =
          before?.sha256 === artifact.sha256 &&
          before.mtimeMs === artifact.mtimeMs
            ? "preexisting"
            : "created-or-updated";
        return [path, { ...artifact, status }];
      }),
    );
    record.coverage = Object.fromEntries(
      Object.entries(record.coverageArtifacts)
        .filter(([, artifact]) => artifact.status === "created-or-updated")
        .map(([path, artifact]) => [path, artifact.pct]),
    );
  }
  evidence.steps.push(record);
  const ok = run.status === 0;
  console.log(
    `${ok ? "ok  " : step.advisory ? "warn" : "FAIL"} ${step.name} (${record.durationMs} ms)`,
  );
  if (!ok) console.log(log.trim().split("\n").slice(-30).join("\n"));
}

evidence.finishedAt = new Date().toISOString();
evidence.passed = evidence.steps.every(
  (s) => s.skipped || s.advisory || s.exitCode === 0,
);
evidence.fullyVerified = evidence.steps.every(
  (step) => step.status === "passed",
);
writeFileSync(
  join(outDir, "evidence.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
const tests = evidence.steps.find((s) => s.name === "test")?.tests;
console.log(
  `verify: ${!evidence.passed ? "FAIL" : evidence.fullyVerified ? "PASS" : "PARTIAL"} at ${evidence.commit.slice(0, 7)}${evidence.dirty ? "+dirty" : ""}` +
    (tests ? `, ${tests.tests} tests in ${tests.suites} suites` : "") +
    `, evidence in ${outDir}/evidence.json`,
);
process.exit(evidence.passed ? 0 : 1);
