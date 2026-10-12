---
name: pas-specupdate
description: Use when the user runs /pas-specupdate or asks to "update SPEC.md to align with what has changed since the last update". Brings a code-adjacent SPEC.md back in line with the code after the fact.
---

# Update SPEC.md after the fact

A `SPEC.md` is the one document describing what a service or app must do, kept aligned with the code. Here it follows the code, on request. It is not an approval gate before coding.

## Steps

1. **Scope.** Take the folder the user names, otherwise the domain (e.g. under `packages/`) that the recent changes touch. If it has no `SPEC.md`, say so and ask whether to create one.
2. **Find the baseline.** `git log -1 --format=%H -- <folder>/SPEC.md` is the last update. If the user gave another reference, use that.
3. **Collect what changed.** `git log --oneline <baseline>..HEAD -- <folder>` and the diff of the non-test code. Also read tracker specs and tickets for the area (under `.scratch/`, or the configured tracker) so the SPEC.md reflects decisions, not just code.
4. **Load the rules.** Invoke `pas-generate-specification` and read its `reference/specification-rules.md` plus any `.agents/specification-rules.md`. The SPEC.md stays implementation-agnostic and describes what the code must achieve, from the user's point of view.
5. **Edit the SPEC.md.** Add requirements for new behaviour, change those whose behaviour changed, and remove those whose behaviour is gone. Do not describe how the code is built.
6. **Report drift you did not resolve.** If code does something no spec or ticket supports, or the code seems wrong against the spec, list it. Do not change code in this step.
7. **Present the diff** of the SPEC.md and stop. The user decides whether to commit.

## Boundaries

- Only the SPEC.md changes. No code, no README.
- Commit messages follow `pas-git`.
