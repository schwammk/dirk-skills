#!/usr/bin/env node
// commit-msg hook: a commit that changes or removes expectations in existing
// specs must say why, in an `Expectation-change:` trailer. Expectations are
// the agreed behaviour; the implementation is what changes to meet them.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TRAILER = /^Expectation-change:\s*\S/im;
const SPEC = /\.(spec|test)\.[cm]?[jt]sx?$/;
const EXPECTATION = /\bexpect(\.\w+)?\(|\.toHaveBeenCalled|\.toThrow/;

const messageFile = process.argv[2];
const message = messageFile ? readFileSync(messageFile, "utf8") : "";
if (TRAILER.test(message)) process.exit(0);

const diff = execFileSync(
  "git",
  ["diff", "--cached", "--diff-filter=M", "-U0", "--no-color"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

const changed = new Map();
let file = null;
const removed = new Map();
const added = new Map();
const bump = (map, key, by) => map.set(key, (map.get(key) ?? 0) + by);

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    file = line.startsWith("+++ b/") ? line.slice(6) : null;
    continue;
  }
  if (!file || !SPEC.test(file) || line.startsWith("--- ")) continue;
  const body = line.slice(1).trim();
  if (!EXPECTATION.test(body)) continue;
  if (line.startsWith("-")) bump(removed, `${file}\0${body}`, 1);
  else if (line.startsWith("+")) bump(added, `${file}\0${body}`, 1);
}

// A line removed and re-added unchanged (moved, re-indented) is no change.
for (const [key, count] of removed) {
  const left = count - (added.get(key) ?? 0);
  if (left <= 0) continue;
  const [path, body] = key.split("\0");
  if (!changed.has(path)) changed.set(path, []);
  changed.get(path).push(body);
}

if (changed.size === 0) process.exit(0);

console.error(
  "expectation-guard: this commit changes or removes existing expectations:",
);
for (const [path, bodies] of changed) {
  console.error(`  ${path}`);
  for (const body of bodies.slice(0, 5)) console.error(`    - ${body}`);
  if (bodies.length > 5) console.error(`    … ${bodies.length - 5} more`);
}
console.error(`
How to fix: keep the expectation and change the implementation until it passes.
If the expected behaviour itself changed (the spec or ticket says so, or the
human agreed), add a trailer to the commit message that says where, e.g.
  Expectation-change: ticket 12 now renders empty lists as [] instead of null
A reviewer reads every Expectation-change trailer.`);
process.exit(1);
