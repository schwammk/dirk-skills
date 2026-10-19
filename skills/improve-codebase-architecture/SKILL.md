---
name: improve-codebase-architecture
description: Use when the user asks to scan or improve a codebase's architecture, find deepening opportunities, or run improve-codebase-architecture.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This command is informed by the project's domain model and built on a shared design vocabulary:

- Call the Skill tool with "codebase-design" for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles: the deletion test, "the interface is the test surface", and "one adapter = hypothetical seam, two = real". Use these terms for architectural roles.
- The domain language in `GLOSSARY.md` gives names to good seams; ADRs in `docs/adr/` record decisions this command should not re-litigate.

## Process

### 1. Explore

**Scope before you scan: YAGNI.** Deepening a module pays off by making future changes to it easier, so put extra weight on the parts of the codebase that have recently changed. Decide where to look before you look:

- If the user named a direction (a module, a subsystem, a pain point), take it, and skip the inference below.
- Otherwise, walk back a good stretch of the commit history (`git log --oneline`) to find the codebase's hot spots, the files and areas that keep coming up, and let those paths pull your attention first. If the changes are scattered with no clear hot spot, widen the net.

Read the project's domain glossary (`GLOSSARY.md`) and any ADRs in the area you're touching first.

Then spawn a subagent to walk the codebase. Explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow**, with an interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called, with no **locality**?
- Where do tightly coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it remove complexity or push meaningful knowledge back into callers? Seek real friction, not opportunities to install catalog patterns.

### 2. Present candidates as an HTML report

**REQUIRED SUB-SKILL:** Before presenting the first structural alternative, call the Skill tool with **pattern-decision** and read its `FORCE-INDEX.md`. Use the observed forces to retrieve candidates. Keep references provisional: a named-pattern candidate, partial analogy, principle/local idiom, or reasoned no-fit can explain a problem without committing to adoption.

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user (`xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows) and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph, flow, or sequence reliably communicates the structure. Mix Mermaid with hand-crafted CSS/SVG visuals: use Mermaid for graph-shaped relationships and hand-built divs/SVG for editorial visuals. Each candidate gets a **before/after visualization**.

For each candidate, render a card with:

- **Files**: the files/modules involved.
- **Problem and forces**: concrete friction, confirmed facts, and relevant unknowns or assumptions. When a deadline is given, state which deliverable it constrains (report, investigation, or implementation); keep unconfirmed implementation urgency open.
- **Provisional solution**: plain English description of what might change, not an interface design.
- **Reference/problem match**: the shared skill's classification, matching problem/force, contract, limit, and primary source where applicable. A no-fit result has a reason instead of an invented pattern.
- **Alternatives and costs**: compare the candidate with the strongest credible alternative, including a cohesive operation or the status quo. Give each mechanism, benefit, cost, and useful circumstances. Include real-collaborator setup versus substitute/contract maintenance when testing is a force.
- **Benefits**: locality, leverage, and how tests would improve.
- **Before / After diagram**: side-by-side, illustrating the current structure and the proposed deepening.
- **Recommendation strength**: `Strong`, `Worth exploring`, or `Speculative`, rendered as a badge. Explain the evidence and unresolved priority behind it.

End with a **Top recommendation**: the candidate you would explore first, why, and what must be settled before choosing its design. A reference name or successful prototype is not evidence that a new port or class is needed.

Include a visible **Next-step handoff** with these three fields:

- **Route**: after selection, call **grilling**; before its first structural question, use **pattern-decision** and read its `INTERVIEW-FORMAT.md`, even when no ADR is planned.
- **Carry forward**: the observed forces, confirmed choices, open facts/priorities, reference classifications and limits, credible alternatives, and costs.
- **First prerequisite**: the unresolved priority or fact to settle before interface design. Keep it open rather than answering it for the user.

Use `GLOSSARY.md` for domain terms and codebase-design for architectural roles. If the glossary defines "Order", talk about "the Order intake module" rather than a class name.

**ADR conflicts:** Surface a contradiction only when real friction warrants revisiting the ADR. Mark it clearly in the card, with the reason to reopen it.

See [HTML-REPORT.md](HTML-REPORT.md) for the HTML scaffold, diagrams, and styling. The report is ready when every card and handoff field is complete and the comparisons remain hypotheses to explore, not final design decisions. Ask: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, execute the handoff's Route with its carried evidence. Revisit the force index when answers change the forces. Settle prerequisites before interface design, and keep adoption open until the user confirms the shared understanding.

As domain decisions crystallize, call the Skill tool with **domain-modeling**:

- Add a newly identified domain concept to `GLOSSARY.md`, creating the file lazily when needed.
- Sharpen fuzzy domain terms during the conversation. Pattern vocabulary stays in comparisons and decision records, not the domain glossary.
- If the user rejects a candidate for a load-bearing reason, offer an ADR so future explorers do not re-suggest it. Skip ephemeral or self-evident reasons; an ordinary interview needs no ADR.
- To explore alternative interfaces, call **codebase-design** and use its design-it-twice parallel-subagent pattern.
