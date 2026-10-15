# Global wiring instructions

Paste into your global `~/.claude/CLAUDE.md` (Claude Code) and global opencode
rules file (`~/.config/opencode/AGENTS.md`). Keep the phrasing "call the Skill
tool with" — it is the phrasing most likely to actually fire the invocation.

**opencode 2 reads `AGENTS.md` only** — it does not fall back to `CLAUDE.md`
(opencode 1 did). To keep one source of truth, symlink instead of pasting twice:

```sh
ln -s ~/.claude/CLAUDE.md ~/.config/opencode/AGENTS.md
```

opencode 1 prefers `AGENTS.md` over its `CLAUDE.md` fallback, so it will not
load the content twice.

```md
## Pattern-language discipline

- When resolving an architectural or integration decision in a grilling session
  or wayfinder decision ticket, call the Skill tool with "pattern-decision"
  before recording the ADR.
- When reviewing or implementing code governed by a pattern-named ADR, call the
  Skill tool with "pattern-review" (conformance against the ADR's contract).
- When a mechanism looks like it is re-deriving a known solution (retry loops,
  hand-rolled queues, delegation chains, registry lookups), call the Skill tool
  with "pattern-review" (retrieval) and adopt the known form knowingly or
  simplify it away.
- Pattern vocabulary belongs in ADRs and ticket pointers, never in the domain
  glossary (CONTEXT.md).
```

## Quality gates stanza

```md
## Quality gates before structural review

- When implementation tasks are complete on a branch, or a branch is ready for
  structural review or a PR is about to be opened or judged merge-ready, call
  the Skill tool with "enforcing-quality-gates" before any review begins.
- The gate's boundary carve-out (GUI, external devices, environment/system
  errors, blocking operations) is the SwarmForge constitution, not a loophole:
  those modules are excluded from every quality tool and kept as minimal
  adapter shells.
- In Nx monorepos with jest, produce lcov for the CRAP gate via
  `npx nx run-many -t test --coverage --coverageReporters=lcov` (PAS jest
  configs emit HTML-only coverage without that flag).
```

## PAS flow stanza (Matt's spine, pas-* overlays)

```md
## PAS repos: Matt's flow is the spine, pas-* skills are overlays

- In PAS Code monorepos the process spine is Matt Pocock's suite
  (grill → to-spec → to-tickets → implement → code-review → pr). The pas-*
  skills are platform overlays, not rival flows; they are written assuming no
  other skills exist, so where they claim all territory, methodology follows
  Matt's flow and platform specifics follow pas-*.
- "pas-spec-driven-development" is not the workflow in these repos. Its approval
  phases and the "STOP — spec-driven gate" in the pas-generate-* skills do not
  apply: never block code on an approved SPEC.md and never make "create
  SPEC.md" the first plan step. Still read the relevant pas-generate-* code
  rules and `.agents/*-rules.md` before writing code. The spec a change is
  judged against is the tracker spec or ticket.
- A code-adjacent SPEC.md per domain is one document of what the service or app
  must do, aligned with the code. It is updated after the fact, on request
  (`/pas-specupdate`, or "update SPEC.md to align with what changed since the
  last update") — call the Skill tool with "pas-specupdate".
- Consult "pas-code-review" as the platform-specific checklist overlay to
  Matt's code-review, not instead of it. A missing or stale SPEC.md is a note,
  not a Blocker.

## Architecture review (TypeScript repos)

- When running "improve-codebase-architecture", call the Skill tool with
  "arch-cycles" and give its output to the exploring sub-agent. Cycles are
  additional information about leakage across seams: no gate, no score, no
  extra report section.
- When writing the HTML report of "improve-codebase-architecture", call the
  Skill tool with "arch-report-mermaid" and run its validator on the report
  before opening it. A bad diagram only shows "Syntax error in text" in the
  browser.
```
