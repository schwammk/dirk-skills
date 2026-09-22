# Wayfinder map Notes snippet

Paste into the `Destination > Notes` block when charting a wayfinder map,
as a standing preference. Keep the domain line project-specific.

```md
## Standing preferences

- Domain: <domain summary here>
- Skills every session should consult: grilling, domain-modeling, pattern-decision
- Architectural and integration decision tickets (wayfinder:grilling): before
  recording the resolving ADR, call the Skill tool with "pattern-decision" and
  enumerate candidates from its FORCE-INDEX.md, including expected rejects.
  The ADR carries a Patterns section: patterns considered, selected (canonical
  name + aliases), why-not the runner-up, consequences accepted.
- Pattern vocabulary lands in ADRs and ticket pointers only — never in
  CONTEXT.md, which stays domain-pure.
- Implementation tickets reference decisions as pointers (per ADR-NNNN, Outbox
  + relay); they do not re-argue decisions.
- Code review of pattern-referencing tickets calls the Skill tool with
  "pattern-review" (conformance against the ADR's contract).
```
