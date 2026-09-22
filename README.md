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

Two instruction lines in your global `CLAUDE.md` / `AGENTS.md` (see
`wiring.md`), plus a standing preference pasted into each wayfinder map's
Notes block (`wayfinder-notes-snippet.md`). No forks of mattpocock/skills.

Escalation path if soft wiring proves unreliable: patch
`domain-modeling/ADR-FORMAT.md` in an npx-owned install of mattpocock/skills
to include the Patterns section (kept unused by default).
