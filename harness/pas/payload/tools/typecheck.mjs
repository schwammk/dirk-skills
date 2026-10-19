#!/usr/bin/env node
// Type-checks every project tsconfig, including the spec configs that jest
// compiles without type checking. Known gaps are listed in typecheck-exclude.json.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const exclude = JSON.parse(
  readFileSync(new URL("./typecheck-exclude.json", import.meta.url), "utf8"),
);
const excluded = new Set(Object.keys(exclude));

function findConfigs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return findConfigs(path);
    return /^tsconfig\.(app|lib|spec)\.json$/.test(name) ? [path] : [];
  });
}

let failed = 0;
const configs = findConfigs(join(root, "packages"));
if (configs.length === 0)
  process.stdout.write("typecheck: no project tsconfigs found in packages/.\n");
for (const config of configs) {
  const name = relative(root, config);
  if (excluded.has(name)) {
    console.log(`skip ${name} (${exclude[name]})`);
    continue;
  }
  try {
    execFileSync("npx", ["--no", "tsc", "-p", config, "--noEmit"], {
      stdio: "pipe",
      cwd: root,
    });
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n${error.stdout}`);
  }
}
if (failed) {
  console.log(
    `${failed} tsconfig(s) have type errors. Fix the types in the code; do not cast them away with any or loosen the tsconfig.`,
  );
  process.exit(1);
}
