#!/usr/bin/env node
// Lints one file an agent has just written and reports what to fix.
//   node tools/agent-hooks/lint-edited-file.mjs <file>   exit 1 on lint errors
//   node tools/agent-hooks/lint-edited-file.mjs --claude reads the Claude Code
//     PostToolUse payload from stdin, exit 2 sends the report back to the model
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const lintable = /\.(ts|mts|cts|js|mjs|cjs)$/;

function fileFromArgs() {
  if (!process.argv.includes("--claude")) return process.argv[2];
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    return payload?.tool_input?.file_path ?? payload?.tool_input?.path;
  } catch {
    return undefined;
  }
}

function lintFile(file) {
  if (!file) return { ok: true };
  const absolute = isAbsolute(file) ? file : resolve(process.cwd(), file);
  const rel = relative(root, absolute);
  if (
    rel === ".." ||
    rel.startsWith(`..${sep}`) ||
    isAbsolute(rel) ||
    !lintable.test(rel) ||
    !existsSync(absolute)
  ) {
    return { ok: true };
  }
  const physical = relative(realpathSync(root), realpathSync(absolute));
  if (
    physical === ".." ||
    physical.startsWith(`..${sep}`) ||
    isAbsolute(physical)
  )
    return { ok: true };
  const result = spawnSync(
    "npx",
    [
      "--no",
      "eslint",
      "--",
      "--flag",
      "v10_config_lookup_from_file",
      "--no-warn-ignored",
      "--quiet",
      "--format",
      "./tools/eslint/agent-formatter.cjs",
      rel,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status === 0) return { ok: true };
  const report = `${result.stdout}${result.stderr}`.trim();
  return {
    ok: false,
    report: `ESLint found errors in ${rel} after your edit. Fix them before moving on.\n${report}`,
  };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const claude = process.argv.includes("--claude");
  const { ok, report } = lintFile(fileFromArgs());
  if (!ok) {
    (claude ? process.stderr : process.stdout).write(`${report}\n`);
    process.exit(claude ? 2 : 1);
  }
}
