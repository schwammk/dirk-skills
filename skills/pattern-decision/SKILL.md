---
name: pattern-decision
description: Bring design-pattern vocabulary (Enterprise Integration Patterns, PoEAA, GoF, distributed-systems idioms) into architectural decisions as a candidate checklist. Use when an architectural or integration decision is being made — during a grilling session, a wayfinder decision ticket, or when recording an ADR. Triggers: how services or components communicate, events vs synchronous calls, queues and delivery guarantees, retries and idempotency, consistency between writes, coupling between contexts, "should we use X or Y", and any question whose answer will be recorded as an ADR.
---

# Pattern Decision

Use named patterns as a **candidate checklist**, never as the driver. Forces first, label second: the argument over coupling, atomicity, delivery guarantees, and blast radius is the design; the pattern name is an annotation that makes it findable later.

## The method

1. **State the forces.** What must hold: atomicity, delivery guarantees, consistency, coupling limits, ordering, throughput, team boundaries. If no force is stated, stop — there is no decision to make yet.
2. **Enumerate candidates from the catalog.** For each force, walk [FORCE-INDEX.md](./FORCE-INDEX.md) and list every pattern that addresses it — *including candidates you expect to reject*. Skipping this walk is the failure mode this skill exists for: the famous solution gets chosen and a better-fitting named alternative (e.g. event sourcing, CDC-direct, a claim check) is never considered. Recall is not enumeration.
3. **Test each candidate against the forces.** Reject with a reason, not a shrug.
4. **Select, and name the why-not for the strongest runner-up.** The runner-up's rejection is the load-bearing part of the record — without it, someone re-litigates the decision in six months with nothing but your conclusion.
5. **Annotate.** End the decision with one line in this shape:

   > ≈ Transactional Outbox + Idempotent Consumer; rejected CDC-direct because consumers would couple to our storage schema.

   Canonical names, catalog aliases in parentheses when helpful (`≈ Publish-Subscribe (EIP; Kafka topic)`). The annotation supplements the forces argument; it never replaces it.

## Scope discipline

- **Architecture/integration decisions** (wayfinder tickets, cross-context design): patterns from the EIP, data-management, and distribution families — Saga, Outbox, CQRS, Anti-Corruption Layer, Publish-Subscribe, and so on.
- **GoF-level micro-patterns** belong at the interface-design level (codebase design, implement), and only when genuinely load-bearing. Do not let a Factory Method debate consume a planning session.
- **Pattern-stuffing guard:** if a plain function resolves the force, no pattern is warranted. The most common failure is inserting a pattern where a simple three-line function would do. Absence of a pattern is never a defect by itself.

## Recording the decision

When the decision becomes an ADR, call the Skill tool with "domain-modeling" for the base ADR format, then append a **Patterns** section:

- **Patterns considered:** the enumeration from step 2, including rejected candidates.
- **Selected:** canonical name and catalog aliases.
- **Why-not the runner-up:** explicit.
- **Consequences accepted:** what the choice costs and why it is acceptable.

Pattern names are pointers, not prose: tickets and specs reference the ADR (`per ADR-0007, Outbox + relay`), they do not re-argue it.

## Where this skill does not apply

- **Research and prototype tickets** — facts and exploration; nothing has been decided, so there is nothing to name.
- **Naming a wayfinder destination** — same reason.
- **The domain glossary** — pattern vocabulary is infrastructure vocabulary. It lands in ADRs, never in `CONTEXT.md`, which stays domain-pure.

## Common mistakes

| Mistake | Reality |
|---------|---------|
| Choosing the famous solution without walking the index | Recall is not enumeration; the runner-up you never named is the one that comes back |
| Annotation without a forces argument | The label decorates nothing; state forces first, then the label |
| GoF debate inside a wayfinder ticket | Micro-patterns emerge at implementation time; keep planning at the integration level |
| Pattern names in `CONTEXT.md` | Domain glossary stays domain-pure; patterns live in ADRs |
| No why-not for the runner-up | The rejection is the decision; record it explicitly |
