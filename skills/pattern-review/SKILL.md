---
name: pattern-review
description: Review code against the structural contract of named design patterns, and recognize hand-rolled structure that reinvents a known pattern. Use when reviewing code that implements a pattern-named ADR, spec, or ticket, during PR or code review, when checking that an implementation actually delivers a claimed guarantee (durability, dedupe, decoupling), or when a mechanism looks like it is re-deriving a known solution (retry loops, delegation chains, hand-rolled queues, registry lookups).
---

# Pattern Review

Two modes. Run the one the situation calls for; both end in the same finding format.

## Mode 1: Conformance

When an ADR, ticket, or name claims a pattern, check the implementation against that pattern's **structural contract and consequences** — not its vibe. A pattern is satisfied by its mechanics, not its vocabulary.

Method:

1. **Identify the intended pattern** from the ADR or ticket (`per ADR-0007, Outbox + relay`). If no ADR names one, switch to Mode 2.
2. **State the contract.** Pull it from the ADR's Patterns section. If the ADR lacks one, call the Skill tool with "pattern-decision" and consult its FORCE-INDEX.md, which records the structural contract of every pattern listed.
3. **Check each contract clause against the code**, not just the class that carries the name — most clauses fail *outside* the named class (the relay, the consumer, the caller).
4. **Check the consequences actually hold**: what the pattern costs (eventual consistency, at-least-once duplicates, ordering loss) must be visible and handled, or explicitly accepted in the ADR.

Classic conformance failures:

- **Outbox without a relay** — rows are written, nothing ever reads and sends them; "durable" becomes "never delivered."
- **Strategy with a `switch` inside** — the branching was moved, not removed.
- **Decorator that shares no interface with what it wraps** — it is an Adapter, or accidental composition.
- **Repository leaking ORM types** through its interface.
- **CQRS with a synchronous read-after-write expectation** and no stated staleness policy.
- **Idempotent consumer keyed on a non-stable ID** (timestamps, random IDs regenerated on retry).
- **Saga step without a compensating action** — the compensation is the pattern; without it there is only a script.

## Mode 2: Retrieval

When reviewing structure that has no pattern-named decision behind it, recognize **structure, not names**. The signal is shape: a delegating field plus wrap-forward chain; a static creator next to a private constructor; a hierarchy of state-holders with a traversing sibling; a base method calling overridable primitives; hand-rolled dedupe or retry tables.

When a named pattern is hiding in plain sight:

- **State the observation**: "This is the X pattern, hand-rolled."
- **Then offer the fork**: adopt the known form knowingly (and record it in an ADR per the "pattern-decision" skill's format), or simplify it away if it does not earn its keep. Never just rename classes to match a catalog — adoption means the contract, not the name.
- **Bespoke is allowed.** If the hand-rolled form is simpler than the pattern and no force demands the pattern's guarantees, say so and leave it alone. Accidental structure (a class that happens to hold and forward to another) is not automatically a pattern.

## Guard rails

- **Absence of a pattern is not a defect.** Only flag a missing pattern when a stated force demands its guarantees.
- **Plain correctness bugs need no pattern justification.** Do not dress ordinary bugs in catalog vocabulary.
- **Do not recommend new infrastructure** when the missing piece is a small component of the existing one (an in-process relay, not a broker).

## Finding format

Each finding states all four:

- **Location**: file:line
- **Claim vs contract**: what the code claims or implies, which contract clause it fails (or which named pattern it silently is)
- **Evidence**: the concrete mechanic that shows the gap
- **Fix direction**: complete the pattern, adopt its known form via an ADR reference, or simplify — and which one, decided

## Common mistakes

| Mistake | Reality |
|---------|---------|
| Checking only the named class | Contracts fail in the relay, the consumer, the caller — check the whole path |
| Flagging "no pattern here" as a finding | Absence is not a defect; forces decide |
| Suggesting a broker for every durability problem | First ask whether a small in-process component completes the existing mechanism |
| Renaming classes to pattern names | Adoption is the contract and the mechanics, never the vocabulary |
| Pattern-flavored praise ("good use of DI") | Review mechanics and guarantees, not decoration |
