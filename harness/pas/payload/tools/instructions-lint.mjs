#!/usr/bin/env node
// AGENTS.md supplies shared activation. OpenCode also loads CLAUDE.md through
// its instructions array, so Matt setup's output and existing prose stay intact.
import { existsSync, readFileSync } from "node:fs";

const AGENTS = new URL("../AGENTS.md", import.meta.url);
const CLAUDE = new URL("../CLAUDE.md", import.meta.url);
const TEXT = existsSync(CLAUDE)
  ? readFileSync(CLAUDE, "utf8").replace(/<!--[\s\S]*?-->/g, "")
  : "";
if (!existsSync(AGENTS) || !/^@AGENTS\.md\s*$/m.test(TEXT)) {
  process.stderr.write(
    "Project instructions require AGENTS.md and an @AGENTS.md import in CLAUDE.md. Add the import without deleting surrounding project instructions.\n",
  );
  process.exitCode = 1;
}
