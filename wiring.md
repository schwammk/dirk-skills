# Global wiring instructions

Paste into your global `~/.claude/CLAUDE.md` (Claude Code) and global opencode
rules file (`~/.config/opencode/AGENTS.md`). Keep the phrasing "call the Skill
tool with" — it is the phrasing most likely to actually fire the invocation.

```md
## Pattern-language discipline

- When resolving an architectural or integration decision in a grilling session
  or wayfinder decision ticket, call the Skill tool with "pattern-decision"
  before recording the ADR.
- When reviewing or implementing code governed by a pattern-named ADR, call the
  Skill tool with "pattern-review".
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
- When the pas-generate-code SPEC.md gate applies, produce the SPEC.md via
  "pas-generate-specification" from the agreed spec before code edits — the
  tracker spec and the code-adjacent SPEC.md are two renderings of the same
  synthesized content.
- Consult "pas-code-review" as the platform-specific checklist overlay to
  Matt's code-review, not instead of it.
```
