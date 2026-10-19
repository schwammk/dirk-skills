# Interview-reference replay results

Date: 2026-10-16. These are observed samples, not a guarantee of future compliance.

## Method

The public surfaces are instructions → the next question, and installed skills → actual calls,
supporting-file reads, and output. [Interview fixtures](fixtures.json) cover seven scenario groups;
the [architecture fixture](architecture-fixtures.json) covers a provisional candidate and handoff.
Each wording variant has five fresh native child sessions per included fixture. The children see
the prompt and instruction snapshot, not the grading rubric or other answers. Every usable answer
was read manually. No existing fixture or expectation changed during the guidance iterations.

The no-proposed-guidance control includes the previously installed grilling skill, pattern skill,
and force index: it is an optimistic reference-already-loaded control, not an uninstructed model.
Native children retain harness instructions, so this is not a statistical-independence claim.
All captured wording samples used the ambient `opencode/gpt-6.1-sol` model, variant `max`;
the runner did not select a model.

## Observed iterations

| Variant | Usable samples | Meet the complete applicable rubric | Interpretation |
| --- | ---: | ---: | --- |
| Existing interview guidance | 35 | 0 | Product intent was generally handled well; reference contracts and comparable explanation fields were missing. These were not 35 incorrect recommendations. |
| First pattern/format treatment | 35 | 32 | One commitment-point explanation and two explanations/sources for an already-discussed Facade were omitted. |
| Focused format correction | 15 | 15 | Settings and Tag cases improved; the administrative negative control stayed brief. |
| Maintained grilling plus corrected format | 35 | 35 | All seven groups met their case checks and applicable explanation branch in this run. |
| Existing architecture guidance | 5 | 0 | Useful deep-module proposals, but incomplete reference comparisons and early comparison handoff. |
| First architecture treatment | 5 | 0 | Candidate comparisons met the checks; every visible handoff omitted the named comparison route. |
| Explicit handoff fields | 5 | 4 | Handoff omissions resolved; one answer ambiguously extended a report deadline to implementation. |
| Explicit deadline scope | 5 | 5 | All candidate and handoff checks met in this run. |

The 140 usable wording samples remain separate from transport errors and blocked launch attempts.
The latest complete wording runs are **35/35 interview replies** and **5/5 architecture replies**.
Wording replay success does not prove skill activation, code correctness, real scan quality, or
HTML diagram rendering.

## What changed because of the observations

- Required comparison slots replaced optional explanation: forces/facts/assumptions, reference
  classification and limits, credible alternatives with mechanisms/benefits/costs/useful conditions,
  one prerequisite question, and a conditional recommendation.
- State-changing policy comparisons expose pending versus accepted state and commitment timing.
- A pattern already proposed in the discussion gets a brief sourced role/limit explanation even
  when it cannot choose the current product policy. Its adoption remains open.
- Administrative decisions use the short reasoned no-pattern branch. Pattern labels and ADRs
  are not requirements for ordinary questions.
- Architecture handoff fields carry the evidence and explicit comparison route across sessions.
  Deadline scope states which deliverable is actually constrained.

Semantic variance is allowed. For example, a Notification candidate can explain accumulated
validation findings without deciding project coverage; a reasoned policy no-fit can also be valid.
The rubric checks contracts and useful comparisons, not identical pattern labels or a historical
accepted answer.

## Reproduction and evidence limits

Use [the runner](replay.py) and the README instructions. Full snapshots, source hashes, session
IDs, answers, and per-sample manual matrices are retained locally under ignored `results/`.
The `control-native` matrix is `baseline-assessment.md`; treatment matrices are
`manual-assessment.md`. Earlier blocked coordinator records are not the native sample index.

This account rejected the stateless generation endpoint and a base-default API session probe
under its free-tier policy. Those attempts produced no usable answers and were not behavioral
failures. Native single-shot children were used for both control and treatment; no model,
credentials, or client metadata was changed to bypass the restriction.

## Installed-skill checks

Three fresh native sessions checked the live installation after source deployment and normal
project relinking. Prompts requested only the entry workflow and supplied synthetic facts;
the comparison skill and supporting-file names were not supplied in those prompts.

| Scenario | Recorded routing before output | Output observation |
| --- | --- | --- |
| Structural grilling | grilling → pattern-decision → interview format and force index → question | Comparable alternatives, sourced contracts/limits, one priority question, conditional recommendation |
| Administrative grilling | grilling → pattern-decision → interview format → question | Brief reasoned no-pattern result; no catalog walk or ADR |
| Architecture candidate | architecture workflow → pattern-decision → force index and interview format → candidate | Provisional comparison, explicit deadline scope, and visible comparison handoff |

All three met their activation and applicable output checks. Tool-result bodies matched the
deployed skill bodies, and required reads completed before the output message began. Source
directories resolved to the live project and stable personal checkout, not the worktrees.
Raw captures, chronological projections, exact-body checks, and the manual assessment remain
under ignored `results/activation-runtime/`. The API's newest-first snapshot order was not
treated as event chronology.

This establishes routing from explicitly requested entry workflows in this installation, not
unsolicited discovery or a hard runtime guarantee. No actual code scan or HTML rendering was
performed. A real future user interview remains the human acceptance trial.
