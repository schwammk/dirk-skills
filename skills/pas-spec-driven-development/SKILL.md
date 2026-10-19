---
name: pas-spec-driven-development
description: Read when another pas-* skill tells you to load pas-spec-driven-development or to pass its "spec-driven gate". In this repo that gate does not apply; this skill points to the workflow that does.
---

# Spec-driven development: not the workflow in this repo

This repository replaces the upstream `pas-spec-driven-development` skill with this one. Its SPEC → CODE → DOCUMENTATION approval gates do **not** apply here.

- The workflow is the one in the root `AGENTS.md`, section **Workflow**. Read it now if you have not.
- A change is judged against its **tracker spec or ticket** (where they live: `docs/agents/issue-tracker.md`), not against an approved `SPEC.md`.
- Never block code on a `SPEC.md`, and never make "create SPEC.md" the first plan step. When a `pas-generate-*` skill says "STOP — spec-driven gate", skip the gate and follow the rest of that skill.
- A code-adjacent `SPEC.md` describes what a service or app must do. It is updated **after** the code, on request, with the `pas-specupdate` skill.
- The phase skills still own their rules: read `pas-generate-code` before writing code, `pas-generate-documentation` before writing a README, `pas-generate-specification` before editing a `SPEC.md`.
