# dirk-skills

Personal agent skills, installable across projects and harnesses via the
[skills installer](https://skills.sh) (`npx skills`) or the link script.

Two companion skills for [mattpocock/skills](https://github.com/mattpocock/skills),
adding design-pattern vocabulary (GoF, Enterprise Integration Patterns, PoEAA,
distributed-systems idioms) to the decide/plan/review workflow as a candidate
checklist and conformance discipline. They follow Matt's skill conventions
(model-invoked, `agents/openai.yaml`, composition via the Skill tool). They leave
upstream installed files untouched; projects can maintain explicit source overrides
when their interview contract needs stronger routing.

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
needs `jq` and finds an executable arch4ts via `ARCH4TS_BIN` or `PATH`.

### arch-report-mermaid (model-invoked)

Syntax rules and an offline validator for the Mermaid diagrams in the
`improve-codebase-architecture` HTML report. Fires when that report is written,
before it is opened. `bash scripts/validate-mermaid.sh <report.html>` parses every
diagram with the real Mermaid parser and exits 1 on errors. Needs Node 24 and
npm; the first run installs the locked Mermaid and jsdom dependencies into a
lock-specific directory under `~/.cache/dirk-skills/mermaid-check` (or
`$XDG_CACHE_HOME`). Later runs work offline. Born from a report where every
"Before" diagram with a labelled dotted edge (`-.leak.-> |"x"|`) failed.

### pas-specupdate (model-invoked)

Aligns a code-adjacent `SPEC.md` with the code after the fact, on request
(`/pas-specupdate`). Baseline is the last commit touching that SPEC.md. Only
the SPEC.md changes.

### pattern-decision (model-invoked)

Explains problems and alternatives using established language before the first
structural recommendation: architecture, UI/state, persistence, asynchronous
relevance, testing seams, and integration decisions. Pattern adoption is optional.

The [force index](skills/pattern-decision/FORCE-INDEX.md) distinguishes named-pattern
candidates, limited analogies, principles/local idioms, and explicit no-fit results.
The [interview format](skills/pattern-decision/INTERVIEW-FORMAT.md) gives credible
alternatives comparable mechanisms, benefits, costs, and useful circumstances, then
ties the recommendation to a stated priority. Product policies remain human choices;
administrative questions keep a short no-pattern path. An ordinary interview needs
no ADR. When an ADR is warranted, the skill adds a Patterns section through
`domain-modeling`.

### pattern-review (model-invoked)

Two review modes: **conformance** (does code implementing a pattern-named ADR
actually satisfy the pattern's structural contract — an Outbox without a relay
is not an Outbox) and **retrieval** (recognize hand-rolled structure that
silently reinvents a named wheel, then adopt the known form knowingly or
simplify it away). Fires during code review and when implementing
pattern-referencing tickets.

## PAS project harness

The [repo-based PAS installer](harness/pas/README.md) provisions shared skills,
project instruction wiring, hooks, lint rules, and verification commands. It
includes the shared `grilling`, architecture, and PAS workflow overrides. No npm
publication is needed. Genuine project overrides remain last in source order.

The personal profile was validated in a fresh OpenCode project with the user's
normal global setup. Repair hints reach the agent even when the TUI does not show
them. This is not a globals-free portability or quality-gate guarantee. The
installer does not change your global skill installation.

## Install standalone skills

Select the skills you want globally (user-level, all projects), for example:

```sh
npx skills add schwammk/dirk-skills -g --skill pattern-decision pattern-review --agent '*' -y
```

Or, without the installer, link directly (covers opencode via
`~/.claude/skills` and Claude Code natively; add `~/.agents/skills` for Codex):

```sh
bash scripts/link-skills.sh
```

The link script links every skill, including PAS overlays. Use the PAS profile
for a project-owned installation with its required tooling and instructions.

Update by pulling this repo; symlinks stay current. For the `npx skills` route,
push this repo to GitHub and add from there.

## Wiring

Instruction stanzas in your global `CLAUDE.md` / `AGENTS.md` (see
`wiring.md` — pattern discipline, quality gates, and the PAS
Matt-spine/pas-overlay precedence), plus a standing preference pasted into each
wayfinder map's Notes block (`wayfinder-notes-snippet.md`). The activation point is
before structural alternatives, not only when recording the final ADR.

OpenCode V2 automatically reads `AGENTS.md`, not `CLAUDE.md`. It can also load
`CLAUDE.md` through its `instructions` configuration. The PAS profile configures
this at project level; it does not depend on a global instructions link. For
manual global wiring, see `wiring.md`.

For a required project interview format, maintain a source override rather than
editing an installed or generated upstream skill. In PAS projects, `.pas/skills`
holds genuine project overrides after the shared profile source. Existing local
copies still take precedence; reconcile them explicitly rather than deleting
them during an update. Preserve supporting files and check fresh-session
resolution, invocation, and reference reads after linking.

These are instruction and evaluation checks, not a runtime message-blocking
guarantee. A named pattern is never required merely to satisfy the format.
