---
name: grilling
description: Use when the user asks to grill or stress-test a plan, idea, or design, or to explore the decisions behind an architecture candidate.
---

# Grilling

Interview until the user confirms a shared understanding. Map the work as a **design tree**:
each decision branches into the decisions that depend on it. Keep confirmed choices, accepted
costs, open facts, and unresolved priorities distinct.

## Start the interview

**REQUIRED SUB-SKILL:** Call the Skill tool with **pattern-decision**, then read
`INTERVIEW-FORMAT.md` from that skill's directory. It owns the required question format,
including product-policy comparisons and the short administrative no-pattern branch.
Supporting files are not loaded merely by invoking the skill.

Before presenting structural alternatives, read that skill's `FORCE-INDEX.md` and perform its
problem-first comparison. A useful reference may be a named-pattern candidate, limited analogy,
principle/local idiom, or a reasoned no-fit result. Adoption is optional; explanation is required.

## Work the frontier

The **frontier** contains only decisions whose prerequisites are settled. Ask **one frontier
question at a time**, using the applicable branch of the shared interview format, then wait.
If the user explicitly requests a batch, include only independent frontier questions. A question
that depends on an unanswered choice belongs to a later round, including recap confirmations.

Finding facts is your job; choosing behavior and priorities is the user's. When exploration is
needed, dispatch a fact-finding subagent rather than asking the user to inspect code or tools.
A running exploration leaves only its downstream questions unsettled: ask another independent
frontier question while it runs. Existing code, tests, prototypes, deadlines, and user trust do
not establish an unstated product promise.

After each answer, update the tree and the decision notes. A corrected requirement replaces the
old premise and reopens dependent branches. Revisit the force index before revised structural
alternatives when the forces change. The question is ready only when its shared-format branch
is complete and its prerequisites are settled.

## Finish

The frontier is empty when every branch has an explicit chosen behavior and accepted cost,
or an openly recorded unresolved fact that prevents action. Summarize those outcomes and ask
the user to confirm the shared understanding. Do not implement, create tickets, or otherwise act
on the design before that confirmation. Use the shared skill's decision-recording branch;
an ordinary interview does not require an ADR.
