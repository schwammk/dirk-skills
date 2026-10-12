# dirk-skills

Personal agent skills, installable across projects and harnesses via the
[skills installer](https://skills.sh) (`npx skills`) or the link script.

Two companion skills for [mattpocock/skills](https://github.com/mattpocock/skills),
adding design-pattern vocabulary (GoF, Enterprise Integration Patterns, PoEAA,
distributed-systems idioms) to the decide/plan/review workflow as a candidate
checklist and conformance discipline. They follow Matt's skill conventions
(model-invoked, `agents/openai.yaml`, composition via the Skill tool) and never
modify his files — his suite stays stock and auto-updatable.

## Skills

### enforcing-quality-gates (model-invoked)

CRAP and DRY gates that must run and pass before a branch is judged ready for
structural review. Verdict comes from the tools
([crap4ts](https://github.com/schwammk/crap4ts),
[dry4ts](https://github.com/schwammk/dry4ts)), never from the agent. Step 1 is
the boundary carve-out from the SwarmForge engineering constitution: modules
touching GUIs, external devices, environment/system errors, or blocking
operations are excluded from every quality tool and kept as minimal adapter
shells — without it, gate budget is wasted extracting functions from
`main.ts`-shaped adapter code. Complements `pattern-review` and hands off to
the code-review flow (Matt's `code-review`, with `pas-code-review` as the
platform overlay in PAS repos).

### arch-cycles (model-invoked)

Informational import-cycle data for TypeScript repos, from
[arch4ts](https://github.com/schwammk/arch4ts) `dump`. Fires when running
`improve-codebase-architecture`; its output goes to the exploring sub-agent as
extra evidence about leakage across seams. Not a gate, no score. The script
needs `jq` and finds arch4ts via `ARCH4TS_BIN`, `PATH`, or a sibling checkout.

### pas-specupdate (model-invoked)

Aligns a code-adjacent `SPEC.md` with the code after the fact, on request
(`/pas-specupdate`). Baseline is the last commit touching that SPEC.md. Only
the SPEC.md changes.

### pattern-decision (model-invoked)

Brings catalog patterns into architectural decisions as a candidate checklist:
forces first, then an explicit enumeration walk of `FORCE-INDEX.md`, selection
with a why-not for the strongest runner-up, and a one-line annotation
(`≈ Transactional Outbox + Idempotent Consumer; rejected CDC-direct because ...`).
Adds a Patterns section to ADRs recorded via `domain-modeling`. Fires during
grilling sessions, wayfinder decision tickets, and ADR recording.

### pattern-review (model-invoked)

Two review modes: **conformance** (does code implementing a pattern-named ADR
actually satisfy the pattern's structural contract — an Outbox without a relay
is not an Outbox) and **retrieval** (recognize hand-rolled structure that
silently reinvents a named wheel, then adopt the known form knowingly or
simplify it away). Fires during code review and when implementing
pattern-referencing tickets.

## Install

Global (user-level, all projects) — recommended:

```sh
npx skills add dirk/skills -g --skill '*' --agent '*' -y
```

Or, without the installer, link directly (covers opencode via
`~/.claude/skills` and Claude Code natively; add `~/.agents/skills` for Codex):

```sh
scripts/link-skills.sh
```

Update by pulling this repo; symlinks stay current. For the `npx skills` route,
push this repo to GitHub and add from there.

## Wiring

Instruction stanzas in your global `CLAUDE.md` / `AGENTS.md` (see
`wiring.md` — pattern discipline, quality gates, and the PAS
Matt-spine/pas-overlay precedence), plus a standing preference pasted into each
wayfinder map's Notes block (`wayfinder-notes-snippet.md`). No forks of
mattpocock/skills.

Escalation path if soft wiring proves unreliable: patch
`domain-modeling/ADR-FORMAT.md` in an npx-owned install of mattpocock/skills
to include the Patterns section (kept unused by default).
