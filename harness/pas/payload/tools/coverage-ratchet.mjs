#!/usr/bin/env node
// Raises the coverageThreshold of every jest.config.cts to the coverage the
// last `npm run verify` measured, minus a margin (default 1 point). It never
// lowers a threshold. Run it after verify when coverage has risen, and commit
// the result.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const margin = Number(
  process.argv.find((a) => a.startsWith("--margin="))?.split("=")[1] ?? 1,
);
const metrics = ["lines", "statements", "functions", "branches"];
const comment =
  "// Ratchet: raise these when coverage rises; lowering one needs a reason in the commit body.";

function* jestConfigs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jestConfigs(path);
    else if (entry.name === "jest.config.cts") yield path;
  }
}

function currentThresholds(source) {
  const block = /coverageThreshold:\s*\{\s*global:\s*\{([^}]*)\}/.exec(source);
  const values = {};
  for (const [, key, value] of (block?.[1] ?? "").matchAll(/(\w+):\s*(\d+)/g))
    values[key] = +value;
  return values;
}

function ratchet(configPath) {
  const source = readFileSync(configPath, "utf8");
  const dir = /coverageDirectory:\s*'([^']+)'/.exec(source)?.[1];
  const summaryPath =
    dir && resolve(dirname(configPath), dir, "coverage-summary.json");
  if (!summaryPath || !existsSync(summaryPath))
    return `skip ${configPath}: no coverage-summary.json (run npm run verify)`;
  const total = JSON.parse(readFileSync(summaryPath, "utf8")).total;
  const old = currentThresholds(source);
  const next = { ...old };
  for (const metric of metrics) {
    const pct = total[metric]?.pct;
    if (typeof pct !== "number") continue;
    const floor = Math.floor(pct) - margin;
    if (floor > (old[metric] ?? 0)) next[metric] = floor;
  }
  const changed = metrics.filter((m) => next[m] !== old[m]);
  if (changed.length === 0) return `same ${configPath}`;
  const values = metrics
    .filter((m) => next[m] !== undefined)
    .map((m) => `${m}: ${next[m]}`)
    .join(", ");
  const block = `  ${comment}\n  coverageThreshold: {\n    global: { ${values} },\n  },`;
  const existing =
    /\n(\s*\/\/ Ratchet:[^\n]*\n)?\s*coverageThreshold:\s*\{[\s\S]*?\n {2}\},/;
  const updated = existing.test(source)
    ? source.replace(existing, `\n${block}`)
    : source.replace(/\n\};\s*$/, `\n${block}\n};\n`);
  writeFileSync(configPath, updated);
  return `up   ${configPath}: ${changed.map((m) => `${m} ${old[m] ?? "-"} -> ${next[m]}`).join(", ")}`;
}

for (const config of jestConfigs("packages")) console.log(ratchet(config));
