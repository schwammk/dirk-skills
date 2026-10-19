## Rules for every change

- Follow the PAS dev guidelines in `node_modules/@pas/dev-guidelines/src/AGENTS.md`: they route to the `pas-generate-code`, `pas-generate-documentation` and `pas-git` skills. Read `.agents/push-rules.md`, when present, before any push.
- `npm run verify` is the definition of done. Run it before you call a ticket done and cite `.verify/evidence.json` (commit, test counts) where the ticket's resolution is recorded.
- Expectations are human-owned: when a test fails, fix the code. Change an existing expectation only when the spec or ticket changed the behaviour, and give the reason in an `Expectation-change: <reason>` commit trailer.
- Lint and hook messages say how to fix a finding; follow them. Thresholds in `eslint.config.mjs` and the coverage ratchets in `jest.config.cts` only go up. Suppress a rule on one line with `// eslint-disable-next-line <rule> -- <reason>`.

## Workflow

Matt Pocock's skills are the spine: `grilling` or `grill-with-docs` → `to-spec` → `to-tickets` → `implement` (`implement-spec` for a set of tickets, `tdd` inside) → `code-review` → `pr`. Bugs go through `diagnosing-bugs`; large fuzzy efforts through `wayfinder`.

## Skill sources

Skill sources are listed in `.pas/skills-sources.json` and linked by `npm install` (`npx pas-link-skills`). On a name clash the later source wins. Shared copies under `.pas/harness/skills` are installer-managed; genuine project overrides in `.pas/skills` come last. Edit those project overrides, not the generated `.agents/skills` installation.
