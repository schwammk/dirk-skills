# PAS harness development

Keep tests at the agreed public seams: the installer CLI and installed consumer
commands. Do not add a public helper-library interface for tests. Use disposable
Git repositories; never install into a reference starter or repoint personal
skill links at a temporary worktree.

## Focused checks

From the dirk-skills root:

```sh
node --test tests/harness-pas/setup.test.mjs
```

These tests control external provisioning commands. They cover planning,
ownership, updates, conflicts, failures, recovery, configuration preservation,
consumer-root resolution, evidence, and installed adapters. They are not proof
of real npm, Nx, or native agent behavior.

## Real dependency checks

Point `PAS_GUIDELINES_DIR` at an installed `@pas/dev-guidelines` package. This
package is copied into the disposable consumer, not modified:

```sh
HARNESS_REAL_LINKING=1 PAS_GUIDELINES_DIR=/absolute/path/to/node_modules/@pas/dev-guidelines node --test tests/harness-pas/linking.test.mjs
HARNESS_REAL_MERMAID=1 node --test tests/harness-pas/mermaid.test.mjs
```

The linking check uses real npm, Husky, the PAS wrapper, the pinned skills CLI,
and ESLint. Its minimal consumer explicitly skips unrelated verify stages.
It checks all shared skill bodies, supporting files, unrelated skills, genuine
local overrides, and normal npm-install relinking. The Mermaid check covers
locked cold setup, warm offline validation, syntax failure, and cold offline
failure.

## Actual starter working snapshots

Set `PAS_BLANK_STARTER` and `PAS_CONFIGURED_STARTER` to the two reference Git
roots. Tests copy tracked and nonignored untracked working files, including
modified instructions and untracked agent documents. A HEAD-only clone is not
an equivalent configured fixture.

Controlled-command preservation check:

```sh
HARNESS_STARTER_SNAPSHOTS=1 node --test tests/harness-pas/starters.test.mjs
```

Real commands, without verify skips or advisories:

```sh
HARNESS_REAL_STARTERS=1 node --test tests/harness-pas/starters.test.mjs
```

The current reference starters have a pre-existing README formatting failure.
To test the prepared baseline explicitly:

```sh
HARNESS_REAL_STARTERS=1 HARNESS_PREPARE_STARTER_README=1 node --test tests/harness-pas/starters.test.mjs
```

That mode first requires the raw install to fail only on `README.md` formatting
and proves setup left it unchanged. It formats only the disposable README,
commits that fixture baseline, and retries. An owned-tooling or other project
failure is not repaired or ignored. Real mode also executes installed commit
hooks and the pre-push script; it never performs a push.

`HARNESS_KEEP_FIXTURES=1` retains disposable starter fixtures for diagnosis.
Otherwise tests remove only their own temporary directories. Do not publish raw
fixture files, credentials, session data, or logs.

## Native OpenCode validation

### Interactive client with the normal global setup

The accepted personal use case includes the user's existing global setup. Record
the OpenCode version, model and agent names, relevant global instruction and
skill sources, plugins, and observed MCP connection state. Record no credentials.
Keep the human checklist outside the disposable project so it does not coach the
first routing prompt.

Check actual runtime behavior, not just linked files:

- Add distinct public markers outside the managed blocks in project `AGENTS.md`
  and configured `CLAUDE.md`. In a fresh session, ask for the markers before any
  file-read task.
- Ask a design question without naming skills. Check the actual skill invocation,
  selected base directory, and reads of the supporting references before output.
- Explicitly load manual-only skills by exact ID. In particular,
  `improve-codebase-architecture` has `disable-model-invocation: true`: its absence
  from the model's advertised list is expected, not an installation failure.
- Repeat the instruction and skill checks from a fresh nested location. A selected
  global copy is valid only when it is an intended recorded source; it does not
  prove selection of the project copy.
- Add an intentional lint violation with an edit tool, without a separate lint
  command. Check that the edit's saved tool result contains the diagnostic and
  repair hint. Record TUI visibility separately, then remove the violation and
  run the clean-file control.

The recorded OpenCode 2.0.32 run used the project skill copies at root and nested
locations. The saved patch result included `no-console` and `injectLogger`, but
the user did not see the hint in the TUI. Keep that presentation limitation
separate from successful agent-facing feedback delivery. Preserve the original
human result and record follow-up findings separately; do not rewrite a failed
visibility check as passed. See `tests/harness-pas/RESULTS.md` from the repo root.

### Optional standalone API diagnostic

Add `HARNESS_OPENCODE=1` to the real linking command. It uses a fresh HOME and
XDG directories, strips inherited OpenCode overrides, and uses the standalone
API without provider inference. It attempts root and nested discovery, effective
skill body and path, and direct activation. An independent native-only control
project helps distinguish bootstrap failures from harness configuration problems.

This diagnostic is not green on OpenCode 2.0.32: root, nested, and native-only
control skill lists are empty; the harness location's agent and plugin lists are
also empty. Activation assertions are not reached. Normal-service list requests
also did not select the requested project through the tested location parameters.
Do not use those wrong-location inventories as evidence against the interactive
project checks. Raw instruction text is privileged; its absence from a client API
response is not a valid instruction-loading failure. No shared human service may
be restarted for this diagnostic. Globals-free API validation remains open and
is not included in the passing automated total.

## Quality and source maintenance

The available dry4ts and crap4ts tools scan TypeScript, not the installer’s
JavaScript. The TypeScript plugin is a process/framework adapter and belongs in
the boundary carve-out. A vacuous zero-unit scan is not a passed JavaScript
quality gate. JavaScript-appropriate risk/duplication validation remains open;
do not declare structural-review or merge readiness.

Keep bundled vendor code unmodified and record exact tarball integrity and
license in `vendor/SOURCES.json`. Keep original extraction provenance in
`SOURCES.json`. Do not copy application policy into the generic profile.
Changes to skill behavior need the skill-authoring baseline and treatment
checks; byte-preserving extraction is not a new interview evaluation.

The user authorized publication on a feature branch, including the existing
cycle, Mermaid, and spec-update prerequisite commits. This does not authorize a
default-branch push, npm publication, or FreeMarker consumer migration. Keep
those operations separate from this branch publication.
