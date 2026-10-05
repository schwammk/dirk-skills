---
name: enforcing-quality-gates
description: Use when implementation tasks are complete on a branch, when a branch is ready for structural review or a PR is about to be opened or judged merge-ready, or when asked whether TypeScript code is "done", "ready to ship", or "ready for review". Discipline skill: CRAP and DRY gates must run and pass first.
---

# Enforcing Quality Gates

## Overview

Two measureable gates stand between "code that works" and "code ready for
structural review": dry4ts (structural duplication) and crap4ts (complexity ×
coverage risk). A gate is not advice — it is a verdict with an exit code.
Exit 0 is the only pass.

**The verdict must come from the tool, not from you.** Tests passing and lint
being clean say nothing about duplication or complexity-vs-coverage. Running
the gates is minutes; the review they protect is hours.

## Step 1 — Carve out the boundary layer (before any metric runs)

Per the SwarmForge engineering constitution: modules that touch **GUIs,
external devices, environment/system errors, or blocking operations** are
excluded from every quality tool — CRAP, DRY, coverage, mutation. Keep them
as minimal adapter shells.

- This is not a loophole; it is Clean Architecture's boundary layer made
  concrete. Adapter code (CLI entrypoints, process exits, console output,
  framework bootstrap) is inherently complex/untestable without fake coverage
  that measures nothing.
- If you skip this step, the gate spends its entire budget "fixing" main.ts —
  producing useless tangles of extracted functions that exist only to satisfy
  a metric.
- If you cannot tell what qualifies as adapter shell, ask, don't guess.

## Step 2 — Run the gates

Adjust source roots to the project (Nx monorepos: `packages`; single projects:
`src`).

```bash
# DRY gate — structural duplication (Jaccard on normalized ASTs)
npx github:schwammk/dry4ts --source-root packages

# Produce coverage, then CRAP gate — complexity × coverage risk
npx github:schwammk/crap4ts --source-root packages \
  --lcov "coverage/**/lcov.info" --use-existing-coverage --threshold 30
```

Details on flags, Nx glob variants, risk bands, and score interpretation live
inside the tools' own help and repos (github:schwammk/crap4ts,
github:schwammk/dry4ts) — no need to memorize them here.

## Step 3 — Handle failure the only way that counts

| Exit | Meaning | Action |
|------|---------|--------|
| 0 | Gate passed | Proceed to review |
| 1 | Gate failed | Refactor the offenders (dry4ts: extract/unify the pair; crap4ts: split the function). Re-run until 0. |
| 2 | Config error | Fix invocation, don't reclassify the gate |

**Never lower a threshold to pass a gate.** The threshold encodes an agreed
standard; editing it under pressure is cheating with a timestamp.

## Step 4 — Report and hand off

Report worst-first scores and the final verdict, then hand findings to the
review flow (e.g. Matt's code-review; pas-code-review's checklist as platform
overlay; pattern-review for pattern-shaped code). The gates catch the
mechanical; the review judges the structural.

## Red Flags — STOP

- "Skip the gates this time / run them in CI later" → the gate IS the CI-later. Run it now.
- "Tests pass, so quality is fine" → tests say nothing about duplication and CRAP.
- "Deadline / user asked me to skip" → state the gate will not run and open the review only with the failure visible. Never mark a branch ready with gates unrun or failing.
- "It's just one function over the threshold" → split it. That is the gate.
- "Threshold is too strict" → changing it is a separate, explicit agreement — never made mid-gate.

**The letter and the spirit are the same here:** an unrun gate and a lowered
threshold are the same violation — pretending the verdict exists when it does
not.
