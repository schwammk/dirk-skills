---
name: pattern-decision
description: Use when comparing architecture, module interfaces, presentation state, persistence, asynchronous results, or testing seams; during structural grilling questions, architecture candidates, wayfinder decisions, or ADR decisions.
---

# Pattern Decision

Explain the problem and competing choices with established language. **Forces first, label second.** A named pattern, a limited analogy, a local idiom, and an explicit no-fit are all valid results. Adoption is optional.

## Before presenting alternatives

Use this skill **before the first structural alternative reaches the user**, including a provisional architecture candidate, not only when an ADR is written. Read [FORCE-INDEX.md](./FORCE-INDEX.md); supporting files are not loaded by invoking this skill. Revisit the applicable sections when the forces change.

For an interview question, also read [INTERVIEW-FORMAT.md](./INTERVIEW-FORMAT.md). It owns the required question shape, short administrative branch, and worked example.

## Method

1. **Separate forces from facts and assumptions.** State the behavior, coupling, consistency, ordering, or testing pressure. Find implementation facts yourself. Ask the user about desired behavior and unconfirmed priorities. Existing tests, a prototype, a deadline, and trust in your recommendation do not establish product intent.
2. **Enumerate candidates.** Walk every applicable force family, including plausible rejected candidates and the simplest viable function or status quo. Recall of the famous pattern is not enumeration. Keep unrelated catalog families out of the comparison.
3. **Classify each useful reference.** Use **named-pattern candidate**, **partial analogy**, **principle/local idiom**, or **no named pattern needed**. Explain the addressed problem, required contract, and limit in plain language; link the index's primary source. For a new catalog claim, verify its primary source before claiming guarantees. A shared pattern can describe both alternatives without choosing between them.
4. **Compare mechanisms fairly.** Every credible alternative gets its mechanism, benefit, cost, and useful circumstance. Include a simpler option when viable. Reject an unsuitable candidate by its missing force or contract, not by its unfamiliar name.
5. **Recommend conditionally.** State which priority favors your choice and what would favor the strongest runner-up. When priorities are unknown, ask the prerequisite policy or priority question rather than silently choosing it. Use the interview format before sending that question.
6. **Record the answer.** Keep the chosen behavior, accepted cost, rejected runner-up, and unresolved facts. A corrected force reopens dependent decisions. Research and prototypes inform choices; they are not adoption decisions.

**Ready to ask:** the comparison has an explicit classification and plain-language limits, comparable credible options, and a recommendation tied to a stated or clearly unconfirmed priority. An explicit no-fit completes retrieval; absence of a named pattern is not a defect.

## Recording the decision

An interview needs no ADR to use this method. Keep a short decision note for ordinary reversible choices. When an ADR is warranted, call the Skill tool with "domain-modeling" for its format and add a **Patterns** section:

- **Considered:** applicable candidates, including rejections and classification limits.
- **Selected:** the mechanism and reference, or explicit no-fit.
- **Why not the runner-up:** the force or cost that decided it.
- **Consequences accepted:** costs and guarantees actually adopted.

Tickets and specs point to an existing ADR rather than re-arguing it. Pattern vocabulary stays in design notes and ADRs, not the domain glossary (`GLOSSARY.md`).

## Scope

- Module/state/testing decisions can use presentation patterns, GoF, and ports/adapters. Integration decisions can use EIP, data-management, and distribution patterns. Match the level to the force; defer unneeded construction details.
- Product policies use the format's behavioral comparison; administrative choices use its short branch. A catalog cannot decide Cancel semantics, project coverage, editing permission, or ticket order.
- Explain idioms as idioms. A draft is not automatically Unit of Work, a stable ID is not Identity Map, and discarding old replies is not Resequencer.
