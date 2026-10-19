---
name: pas-code-review
description: 'Review code changes for a PAS monorepo. Use whenever the user asks for a code review, mentions "review this", "review my changes/PR/MR", "pull request", "merge request", "is this ready to merge/ship", "review checklist" or "Definition of Done", or wants completeness checked before opening or merging a PR. MUST be consulted before producing any code-review summary, PR/MR description, or merge-readiness verdict.'
---

# Code Review

> This repo replaces the upstream skill with this copy: the change is judged against its tracker spec and tickets, and a missing `SPEC.md` is a Nit (see the Workflow section of the root `AGENTS.md`).

Reviews pending code changes against dev guidelines and produces a structured, severity-ranked verdict.

**Use when:** the user asks to review changes, prepare/assess a PR or MR, or judge whether code is ready to merge or ship.

---

## Step 1 — Read the canonical guidelines first

These are the source of truth. The checklist below is a fast operational summary, not a replacement — read these before forming a verdict:

1. The active agent's `AGENTS.md` (in whichever agent folder the running agent uses) — read all guidelines and files it references. This automatically loads the **code rules** and **documentation rules** that the review must check the change against.
2. The **tracker spec and tickets** the change implements (where they live: `docs/agents/issue-tracker.md`). They are what the change is judged against. The workflow is the one in the root `AGENTS.md`, section Workflow; the upstream spec-driven approval gates do not apply in this repo.

If a checklist item below conflicts with the guidelines above, the guidelines win.

## Step 2 — Identify the change set

Determine what is under review. Prefer the diff against the base branch:

```bash
git fetch origin
git diff origin/main...HEAD        # or the relevant base branch
git diff --stat origin/main...HEAD
```

Review only the changed files and their direct blast radius — do not review the whole tree.

For every changed file, also locate the `SPEC.md` that governs it: the `SPEC.md` in the same folder, then each parent folder up the tree. It is updated after the fact (`pas-specupdate`), so drift against it is a note, not a finding.

## Step 3 — Run the checks

### Spec conformance (check first)

- Read the tracker spec and the tickets the change claims to implement. Every acceptance criterion has corresponding code and a test that would fail without it. Missing or diverging behaviour is a finding.
- Flag code that no ticket asks for: new behaviour, endpoints, options or fields. Either the code overreaches or the ticket is stale.
- A ticket's resolution must cite evidence (`.verify/evidence.json` from `npm run verify`, test names), not only claim results. A claim the evidence does not back is a **Blocker**.
- Tests whose expected values changed together with the implementation need a reason in the ticket or commit; an expectation weakened to make a test pass is a **Blocker**.
- A missing or stale code-adjacent `SPEC.md` is a **Nit** with the hint to run `pas-specupdate`, never a Blocker.

### Code rules conformance

- Check the change against the **code rules** loaded automatically via the agent's `AGENTS.md` in Step 1. Every rule that applies to a changed file must be satisfied; each violation is a finding.
- These rules take precedence over the fast operational checklist below — where they conflict, the loaded code rules win.

### Sub skills

- Use any relevant sub-skills to check the changed file types and contents.

### Correctness & design

- Logic is correct; edge cases and error paths handled; no obvious race conditions or unhandled rejections.
- No dead code, leftover `console.log`, `debugger`, commented-out blocks, or stray `TODO`s without a tracking issue.
- Public APIs and types are coherent; shared types live in `service/types`, not duplicated.

### Tests

- New / changed behaviour has `*.spec.ts` coverage (Jest).
- Tests pass: `npx nx run <project>:test` for affected projects, or `npm test`.
- No skipped (`xit`/`it.skip`) or focused (`fit`/`it.only`) tests left behind.

### Style, lint & build

- Prettier clean (single quotes). The Husky + lint-staged pre-commit hook was **not** bypassed (`--no-verify`).
- `npm run verify` passes (format, lint, typecheck, tests with coverage thresholds).
- `npm run build` succeeds for affected projects.

### Commits

- Messages follow the commit rules owned by `pas-git`. Read its
  `reference/commit-rules.md` and judge against it rather than from memory.

### Security & secrets

- No hard-coded secrets, tokens, or credentials; no secrets in logs.
- External input is validated; no injection or unsafe deserialization risks introduced.

## Step 4 — Report

Output the verdict grouped by severity. For each finding give `path:line`, the problem, and a concrete fix:

- **Blockers** — must fix before merge.
- **Should-fix** — fix before merge unless explicitly deferred with a reason.
- **Nits** — optional polish.

State spec conformance explicitly: which tracker spec and tickets the change implements, whether the code matches them, and any drift in either direction. Mention a stale `SPEC.md` as a Nit.

End with an explicit merge-readiness line: **Ready to merge**, **Ready after blockers resolved**, or **Not ready**.

---

## After skill usage

Note as the last step that the `pas-code-review` skill was used.
