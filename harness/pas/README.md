# PAS project harness

A repo-based installer for a PAS Code Nx project. It installs project-owned
skills, instruction wiring, hooks, lint rules, and verification commands. It
does not publish or require a dirk-skills npm package.

**Validated personal profile:** a fresh project was checked in OpenCode 2.0.32
with the user's normal global setup. Project instructions, root and nested skill
activation, reference reads, and agent-facing edit feedback worked. The TUI did
not show the repair hint, although the saved tool result contained it. This is
not a globals-free portability or quality-gate guarantee.

## Requirements

- Node 24 or later, npm, and Git.
- A complete dirk-skills checkout, including the bundled vendor files.
- An existing PAS Nx project with `package.json`, `nx.json`, and
  `.pas/skills-sources.json`, at the root of a clean Git working tree.
- Access to the npm registry and the pinned Matt skill sources for first setup.

The project supplies its PAS packages, Nx, TypeScript, and Prettier. The installer
pins its additional tooling. It does not replace incompatible dependency pins,
custom lint configurations, or reserved scripts without an explicit conflict.

## Install

First inspect the read-only plan:

```sh
node /path/to/dirk-skills/harness/pas/setup.mjs /path/to/project --plan
```

Then run the same command without `--plan`:

```sh
node /path/to/dirk-skills/harness/pas/setup.mjs /path/to/project
```

The plan does not write project files or run provisioning commands. Installation
writes the planned files, installs dependencies with lifecycle scripts disabled,
initializes Husky, runs the PAS skill linker, and runs `npm run verify`. It does
not run unrelated project lifecycle commands or project-specific rebuilds.

The setup order is:

1. Scaffold the PAS project.
2. Install this harness.
3. Run `/setup-matt-pocock-skills` to choose the project tracker, labels, and
   domain-document layout.

Matt setup can keep its settings in `CLAUDE.md`. Existing prose and project
settings stay in place. Do not rerun Matt setup merely to update the harness.

Manual-only skills, such as `improve-codebase-architecture`, remain loadable by
exact ID but are not advertised to the model. Their absence from the advertised
list does not mean that installation failed.

## Update and ownership

Run the same installer command to update. An unchanged installation is a no-op.
The project keeps a complete shared skill snapshot under `.pas/harness/skills`
and records hashes, source provenance, and command outcomes in
`.pas/harness/state.json`. A normal project `npm install` links the recorded
sources; it does not need the original dirk-skills checkout.

The source order is PAS baseline, unrelated existing sources in their relative
order, pinned Matt engineering and productivity sources, shared profile skills,
then genuine `.pas/skills` overrides. Existing agent selections are preserved.
Existing same-name local overrides still win. Review them explicitly before
removing any copy of a moved shared skill.

Instruction and ignore files use managed blocks. Configuration changes preserve
unrelated fields, comments, and prose. Locally edited managed files, blocks,
fields, or source order cause a conflict before writes. There is no `--force`
overwrite mode. Project-specific files, remotes, credentials, review instances,
engine policy, and tracker choices are not copied from FreeMarker.

Only owned runtime files and managed configuration ranges are formatted. Shared
skill bodies and supporting files keep their source bytes. Plain project JSON
Prettier options are supported. Executable, shared, plugin-based, or overridden
formatter configurations require explicit integration; setup will not evaluate
them during a plan. Parent and EditorConfig resolution is not implemented.

## Failures and verification

A failed child command stops installation and returns a nonzero exit status.
The state records the failure and reports a partial installation, not rollback.
An unchanged failed installation can resume with the same command. Unrelated
uncommitted changes block that retry. Commit intentional project fixes before
retrying; reconcile managed-content conflicts explicitly.

Setup does not format the whole project, suppress type errors, lower thresholds,
or run the mutating coverage ratchet. Pre-existing project failures remain
failures. Fix them in the project rather than hiding them in setup.

`npm run verify` writes `.verify/evidence.json`. Skips and advisory failures
produce `PARTIAL`, not an unqualified `PASS`. Missing test summaries are recorded
as unreported; an empty scaffold is not evidence of passing application tests.
Existing coverage files are distinguished from newly produced measurements.

## Optional GitLab CI

Add `--with-ci` to install a pipeline only when `.gitlab-ci.yml` is missing.
An existing pipeline is left untouched. A pipeline created by the installer stays
managed on later updates, even without repeating the flag.

The template runs verification for branch and merge-request pipelines on Node 24
and keeps `.verify/` artifacts for 30 days. It does not provision runners,
deployment infrastructure, credentials, or project-specific system dependencies.
