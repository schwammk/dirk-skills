# Wayfinder how-to

A practical walkthrough of [mattpocock/skills](https://github.com/mattpocock/skills)
`wayfinder`, for someone who has not yet worked with the suite. Verified against
the wayfinder SKILL.md of 2026-09.

## What it is

Wayfinder is for work **too big for one agent session**: a loose idea wrapped in
fog. Instead of charging at the build, you chart a "map" — one issue on your
tracker (`wayfinder:map` label) — and then walk it, resolving **decision
tickets** one per session until the route is clear. Its motto: **plan, don't
do** — it produces decisions, not deliverables.

## Phase 1: Chart the map (one session)

Invoke wayfinder with the loose idea. Five things happen:

1. **Name the destination.** Via a grilling + domain-modeling session: *what
   does "done" look like* — a spec to hand off? A decision locked before
   planning? An in-place migration? The destination fixes the scope of
   everything that follows.
2. **Map the frontier.** A second, **breadth-first** grilling pass: fan out
   across the whole space, surface open decisions rather than going deep on any
   one. If no real fog surfaces, you don't need a map — one session will do.
3. **Create the map issue** with four sections:
   - **Destination** — what the end looks like (1–2 lines; every session
     orients to it)
   - **Notes** — domain summary, standing preferences, skills to consult. *This
     is where you paste the `wayfinder-notes-snippet.md` block* — that is how
     `pattern-decision` gets pulled into every session
   - **Decisions so far** — index of closed tickets (one line each, linking the
     detail)
   - **Not yet specified** ("fog") — questions you can *sense* are coming but
     cannot state sharply yet
4. **Create the tickets you can specify now**, then wire **blocking edges** in
   a second pass. Ticket-vs-fog test: *can you state the question precisely
   now?* If not, it stays in fog and graduates later.
5. **Fire research subagents** for all `research` tickets in parallel, then
   stop. Charting resolves nothing itself.

## Phase 2: Work the map (one session at a time)

Each session: load the map (low-res view), pick the next **frontier** ticket —
open, unblocked, unclaimed — **claim it by assigning yourself first**
(concurrent sessions skip claimed tickets), resolve it, post the answer as a
resolution comment, close it, append a one-line pointer to Decisions-so-far,
and graduate any fog the answer just sharpened into new tickets.

**Hard rule: one ticket per session** (research excepted). Each resolution
clears the fog ahead — the "fog of war" mechanic. Refer to tickets by **name**,
not `#42`.

## Ticket types

- **Grilling** (HITL, the default) — conversation that stress-tests a question;
  a grilling agent answering its own questions is a broken session, the human
  speaks for themselves
- **Research** (AFK) — facts from outside the working directory; resolved by
  subagents
- **Prototype** (HITL) — cheap, rough, concrete artifacts to react to when "how
  should it look/behave" is the open question
- **Task** (either) — manual work that *unblocks a decision* (sign up for a
  service, move data); the only type that does rather than decides, and it
  earns its place by unblocking, not delivering

**HITL tickets only resolve through live exchange with you.**

## The handoff

The map is done when the frontier is empty — every decision made, no tickets
left. Then:

1. **`to-spec`** collapses the cleared map into a single spec (ADRs hold the
   "why"; the spec holds the "what")
2. **`to-tickets`** slices it into **tracer-bullet tickets** with blocking
   edges — session-sized, end-to-end-first
3. **`implement` + `tdd`** (e.g. the superpowers suite) executes them; tickets
   reference decisions as pointers (`per ADR-0007, Outbox + relay`), never
   re-arguing
4. **`code-review`** at the end — where `pattern-review` fires on
   pattern-governed tickets

## How the pattern wiring slots in

- The **Notes snippet** makes `pattern-decision` a standing consult for every
  grilling/decision ticket, and mandates the enumeration + why-not + ADR
  Patterns section — mechanically, every session, without relying on memory
- **Global CLAUDE.md/AGENTS.md lines** (see `wiring.md`) back it up in case the
  Notes do not fire
- Ruled-out work goes to the map's **Out of scope** section and never
  graduates; scope boundary is not a step on the route

## Practical tips

- A tracker must be configured — `/setup-matt-pocock-skills` sets it up
  (GitHub Issues by default); the tracker doc defines how map, tickets, and
  blocking physically live there
- The known failure mode lives in the Notes: "plan, don't do" is a standing
  preference, not a hard constraint — sessions can drift into executing. Watch
  for it, especially on task-flavored decisions; the pull to *just build it*
  usually means you have hit the map's edge and it is handoff time
- Multiple sessions can work unblocked tickets in parallel; expect concurrent
  tracker edits
