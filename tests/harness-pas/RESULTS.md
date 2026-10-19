# PAS harness extraction checks

Date: 2026-10-19. The shared sources are prepared for feature-branch publication
from the isolated dirk-skills worktree. No original application checkout,
starter, personal skill link, or global agent setting was changed. No npm
publication or FreeMarker consumer migration is part of this work. Disposable
test repositories have their own synthetic commits.

## Fresh passing checks

| Check                                                                             | Result                      | What it proves                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test tests/harness-pas/setup.test.mjs`                                    | 66 passed, 0 failed/skipped | Public CLI and installed-command contracts with controlled external provisioning                                                                                                                               |
| Real PAS linking mode                                                             | 1 passed, 0 failed/skipped  | Real npm/PAS/skills 1.7.2, all 11 shared skills and support files, local-last overrides, unrelated skill preservation, normal npm-install relinking, real ESLint and repair formatter, installed edit-lint CLI |
| Real Mermaid mode                                                                 | 1 passed, 0 failed/skipped  | Locked Mermaid 11.17.2/jsdom 27.4.0 setup, warm offline use, all-diagram parsing, syntax/setup failure distinction                                                                                             |
| Real blank and configured starter modes, explicit README-only fixture preparation | 2 passed, 0 failed/skipped  | Actual working-state preservation, full consumer verify, installed Git hooks, unchanged rerun                                                                                                                  |

Commands and opt-in variables are documented in
[`harness/pas/CONTRIBUTING.md`](../../harness/pas/CONTRIBUTING.md).

The final combined run enabled real linking, Mermaid, and prepared-starter
modes: **70 passed, 0 failed, 0 skipped**. The native OpenCode probe was explicitly
disabled for that run and is not included in this passing total.

The final real-starter run recorded these fixture-only evidence commits:

- Blank: `4c3663799101b29a2322f15c42f274ca9acbfc9a`.
- Configured: `5c6c732904b2497108fb630ff39e3953097500b4`.

Both `.verify/evidence.json` files reported `fullyVerified: true`. Test summaries
were **unreported**, not zero or invented passing application tests: these are
empty starter projects. Both checks also exercised a rejected invalid commit
message, an accepted conventional commit through the installed pre-commit and
commit-msg hooks, and the pre-push script without a push.

The raw reference snapshots fail their existing README formatting check. The
prepared mode first proves that README is the only warning and is unchanged by
setup, then repairs only the disposable copy. This is not a claim that untouched
reference starters verify cleanly.

Final source checks passed: Prettier on 28 explicit source/documentation paths,
17 JavaScript syntax checks, a TypeScript plugin runtime import, six shell
syntax checks, and authored-source Git diff whitespace checks. Protected source
hashes and the three extracted interview/architecture files match their recorded inputs.
All 16 bundled vendor runtime, metadata, and license files also match their
pinned, SHA512-verified npm archives byte for byte.

The staged whitespace check excludes those immutable third-party runtime and
license files. The original archives contain CRLF and trailing spaces, including
spaces inside generated JavaScript string literals; their bytes were preserved,
not reformatted or reported as an unqualified whitespace-check pass.

## Interactive preparation follow-up

The real installed edit-lint CLI initially failed on clean files because npm
consumed the ESLint options. The controlled subprocess tests did not catch that
argument-parsing defect. The real linking test now invokes the installed CLI
from a nested directory against both valid and invalid TypeScript. Its clean-file
assertion failed before the fix; an explicit argument separator fixed it without
changing existing expectations. The combined suite was then rerun: **70 passed,
0 failed, 0 skipped**, with the native API probe still disabled.

A retained disposable project and external human guide were used for the
interactive check below. Preparation and command checks were not counted as
human results.

## Interactive validation and follow-ups

The user ran OpenCode 2.0.32 with the normal global setup, GPT-6.1 Sol, the Build
agent, and an observed connected MCP. The baseline recorded global instruction
wiring, shared Dirk skills, Superpowers, DCP, and jCodeMunch without credentials.
The intended acceptance scope includes that existing setup, not globals-free
portability.

| Observation                          | Recorded outcome                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Cold design task without skill names | `pattern-decision` invoked before `codebase-design`; alternatives used idioms                                                  |
| Project instructions                 | Both public AGENTS and configured-CLAUDE markers available before instruction-file reads                                       |
| Root and nested skill use            | Project `.agents/skills/pattern-decision` selected; skill invoked and both supporting Markdown files read                      |
| Architecture follow-up               | Explicit loading selected project `.agents/skills/improve-codebase-architecture`                                               |
| Automatic edit feedback              | Saved native patch output contained the `no-console` diagnostic and `injectLogger` repair hint without a separate lint command |
| TUI visibility                       | The repair hint was not visible to the user; this remains a presentation limitation                                            |
| Repair control                       | Passed after removal of only the intentional console statement                                                                 |

The original manual run remains **`OVERALL=FAIL`** in its retained result file.
Two separate follow-ups explain it; the original record was not overwritten:

1. The checklist incorrectly required the manual-only architecture skill to be
   advertised. Its `disable-model-invocation: true` flag intentionally hides it
   from the model's advertised list. Explicit loading by exact ID passed without
   changing the skill, permissions, or configuration.
2. The native patch's saved result contains a second text item with `How to fix`
   and `no-console: Log through the PAS logger (injectLogger, ...)`. The user
   reported that the TUI did not show the hint; the quoted assistant summary also
   omitted it. Agent-facing delivery is confirmed; human-visible TUI feedback was
   not relabeled as passed.

The user accepted the intended functional validation and authorized feature-branch
publication with that limitation. No complete architecture workflow, universal
future routing, or globals-free installation was validated by these checks.

## Open validation

- **Standalone API diagnostic:** the opt-in probe fails on v2.0.32. Root,
  nested, and independent native-only control discovery all return empty skill
  lists; the harness location's agent and plugin inventories are also empty. Locations identify the
  correct Git roots. Activation assertions have not been reached. This does not
  prove an installer defect or an interactive-client failure.
  A further fresh control with an explicit `location[directory]` API parameter
  also returned an empty list; implicit location alone does not explain it.
  Later normal-service list requests returned the home location rather than the
  requested project. Those inventories do not negate the separate native session
  evidence. Raw instruction contents are privileged, so API text absence is not
  an instruction-loading failure oracle.
- **JavaScript quality gates:** dry4ts/crap4ts help confirms TypeScript-only
  input. No meaningful JavaScript gate verdict or structural-review verdict is
  claimed. Do not score the process adapter or report an empty scan as a pass.
- **Publication and adoption:** only a feature-branch publication is authorized,
  including the two existing cycle/Mermaid/spec-update prerequisite commits.
  This is not a default-branch merge, npm release, or FreeMarker migration, and
  it does not claim that the unresolved JavaScript quality gates passed.

Prior interview replay results are separate evidence. They were not rerun or
counted as installer tests. Shared interview wording and supporting contracts
were preserved; helper portability and YAML metadata repairs were tested at
their consumer seams.
