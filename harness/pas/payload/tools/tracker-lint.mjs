#!/usr/bin/env node
// Reports tracker tickets whose Status disagrees with their body:
// a Resolution or Answer under a status that is not resolved, or a resolved
// ticket with unchecked acceptance criteria. Only for the local markdown
// tracker that setup-matt-pocock-skills records in docs/agents/issue-tracker.md.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const tracker = ".scratch";
const config = "docs/agents/issue-tracker.md";
const findings = [];

if (!existsSync(config) || !readFileSync(config, "utf8").includes(tracker)) {
  console.log(
    `tracker-lint: ${config} names no local markdown tracker; nothing to check.`,
  );
  process.exit(0);
}

for (const feature of existsSync(tracker) ? readdirSync(tracker) : []) {
  const issues = join(tracker, feature, "issues");
  if (!existsSync(issues)) continue;
  for (const name of readdirSync(issues).filter((n) => n.endsWith(".md"))) {
    const path = join(issues, name);
    const text = readFileSync(path, "utf8");
    const status = /^(?:\*\*)?Status:?(?:\*\*)?:?\s*(.+)$/m
      .exec(text)?.[1]
      .trim();
    const resolved = /^resolved\b/.test(status ?? "");
    const answered = /^## (Resolution|Answer)\b/m.test(text);
    const unchecked = (text.match(/^\s*- \[ \]/gm) ?? []).length;
    if (!status) findings.push(`${path}: no Status line`);
    else if (answered && !resolved)
      findings.push(`${path}: has a Resolution but Status is "${status}"`);
    else if (resolved && unchecked)
      findings.push(`${path}: resolved with ${unchecked} unchecked criteria`);
  }
}

for (const finding of findings) console.log(finding);
if (findings.length) {
  console.log(
    `${findings.length} ticket(s) drift. Set "Status: resolved" when the Resolution is written, and check each criterion the Resolution proves; mark one that was dropped as "- [x] ~~criterion~~ dropped: <reason>".`,
  );
  process.exit(1);
}
