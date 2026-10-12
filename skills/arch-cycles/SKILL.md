---
name: arch-cycles
description: Use when running improve-codebase-architecture, or when asked about circular dependencies / import cycles in a TypeScript repo. Produces informational cycle data from arch4ts. Not a gate.
---

# Import cycles (informational)

## Install (if `scripts/arch-cycles.sh` is missing)

The script ships in the `dirk-skills` repo. If it is not present under this skill's base directory (e.g. the skill was installed without its `scripts/` folder), install it first:

1. Get the repo: `git clone git@github.com:schwammk/dirk-skills.git ~/Projects/schwammk/dirk-skills` (skip if it already exists; `git pull` instead).
2. Link or copy it:
   - `~/Projects/schwammk/dirk-skills/scripts/link-skills.sh` re-links every skill, including `arch-cycles`, into `~/.claude/skills`; or
   - copy `~/Projects/schwammk/dirk-skills/skills/arch-cycles/scripts/arch-cycles.sh` into this skill's `scripts/` folder and `chmod +x` it.
3. Make sure `jq` is installed (`command -v jq`).
4. Make sure arch4ts is available (`command -v arch4ts`, or `ARCH4TS_BIN`, or a sibling `arch4ts` checkout). If not: `git clone git@github.com:schwammk/arch4ts.git ~/Projects/schwammk/arch4ts && cd ~/Projects/schwammk/arch4ts && npm install && npm run build && npm link`.

Tell the user what you installed. If a step fails (no network, no repo access), say so in one line and carry on without cycle data.

Run `scripts/arch-cycles.sh` (relative to this skill's base directory) from inside the repo. It prints one summary line, then one line per cycle and per feedback edge. It always exits 0 and leaves no files in the repo.

```
modules: 150  imports: 321  cycles: 0  feedback edges: 0
cycle: src/a.ts -> src/b.ts -> src/c.ts -> src/a.ts
feedback edge: src/c.ts -> src/a.ts (line 1)
```

## How to use the result

- It is evidence, not a verdict. Never fail, block, or score anything on it.
- In `improve-codebase-architecture`, hand the output to the exploring sub-agent. A cycle is evidence of leakage across a seam; a feedback edge is the single import that, if removed, breaks the cycle. Draw cycles as the existing red "leak" edges. Add no extra section to the report.
- `cycles: 0` means no file-level cycles were found, nothing more. arch4ts has no boundary rules and no coupling metrics.
- If the script prints `skipping`, say so in one line and carry on without cycle data.

## Caveats

- arch4ts reads only `<root>/tsconfig.json`. If the repo has none, the script writes a temporary one that extends `tsconfig.base.json` (when present) and includes `packages/`, `apps/`, `libs/`, `src/` (whichever exist), then removes it. Without the aliases, cross-package imports are silently dropped.
- Spec/test files are excluded. Dynamic `import()` is ignored and type-only imports count as ordinary imports. Only `.ts` and `.tsx` files are read.
- arch4ts is found via `ARCH4TS_BIN`, then `arch4ts` on PATH, then a sibling `arch4ts` checkout next to the `dirk-skills` repo.
