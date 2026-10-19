# Interview replay checks

These checks sample the next interview question against fixed, problem-first
fixtures. A historical accepted recommendation is not the expected answer.

Use Python 3. The default runner also needs an authenticated OpenCode V2 CLI and
access to its stateless generation API. Each call uses the server's configured
default model and can incur usage. The runner does not change models or configuration.

```sh
python3 tests/pattern-interviews/replay.py \
  --instructions /path/to/grilling/SKILL.md \
  --instructions /path/to/pattern-decision/SKILL.md \
  --instructions /path/to/pattern-decision/FORCE-INDEX.md \
  --instructions /path/to/pattern-decision/INTERVIEW-FORMAT.md \
  --out /path/to/new-result-directory
```

Run an unchanged control before editing guidance. Run the treatment with the same
fixtures and at least five fresh samples per case. `--case ID` selects a case;
`--workers 3` bounds concurrency. Output directories must be new, so prior evidence
is not overwritten. The manifest preserves exact instruction snapshots and hashes.
Use `--fixtures tests/pattern-interviews/architecture-fixtures.json` for the candidate-card
and handoff case, with the architecture and codebase-design instructions instead of grilling.
Keep the shared pattern references in that treatment's instruction inputs.

If the account cannot use stateless generation, add `--prepare`. This writes one
blind prompt packet per case without calling the API. Run each packet in at least
five distinct, fresh native OpenCode subagents. Give each subagent only the packet,
not the fixture rubric or other responses. Save its full answer and session ID as
`<case>-<sample>.md` and in an index. Count transport errors as invalid samples,
not behavioral failures. Keep the same transport for control and treatment.
The API mode stops after its first request if that transport is unavailable.

Read every response against its fixture's checks. Record pass, fail, or not
applicable per check, with a short quote and reason. Inspect variability and
conciseness, not just the presence of a heading or a pattern name. A process exit
of zero means all generation requests returned text, not that the interviews pass.

These are wording checks: the reference material is supplied as already loaded.
Separately verify fresh-session skill resolution, actual invocation, supporting
file reads, and the first question. Neither test proves universal future behavior.

`results/` is ignored: keep session evidence and instruction snapshots local. Publish the
fixtures, runner, and a reviewed summary rather than raw session records.
