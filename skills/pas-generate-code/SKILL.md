---
name: pas-generate-code
description: Use when writing, editing, or refactoring TypeScript/JavaScript in this PAS monorepo — carries the canonical PAS code rules (typing, structure, encapsulation, DI, scoped providers, configurable objects, styling, testing). Trigger on write/add/implement/refactor code, or scaffolding a service/module/component/provider.
---

# PAS Code Generation

> This repo replaces the upstream skill with this copy: the upstream "STOP — spec-driven gate" is
> removed (see the Workflow section of the root `AGENTS.md`). The rule files stay upstream, in
> `node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/`.

Home of the canonical **code rules** for the PAS monorepo. The rules are split into focused
topic files under [`reference/`](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/); read the ones relevant to your task before writing
code, and follow them while you write. Do not restate the rules from memory — open the file.

A repository may also add **project-level** `.agents/code-rules.md` rules that complete or
override these global rules — read it when present; on conflict, the project level wins.

## Prefer a more specific PAS skill

Before implementing, check whether a more specific `pas-*` skill already covers the task (e.g.
`pas-integrate-openapi` for the OpenAPI documentation of a service) — if one does, follow it instead of hand-rolling the
code from these generic rules.

## Always apply

These apply to essentially every change — read them for any code task:

- **Coding standards**: typing, `const`/`let`, naming, access modifiers, early returns, TSDoc. Read [coding-standards.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/coding-standards.md)
- **Project structure**: organize by logical domain, not by object type. Read [project-structure.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/project-structure.md)
- **Best practices**: logging over `console.log`, reusability, cross-runtime portability, component/markup rules. Read [best-practices.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/best-practices.md)

## Structuring code

When deciding how to expose, import, or organize code, consult:

- **Encapsulation**: no raw exported functions; expose behaviour as class methods (decorator-factory exception). Read [encapsulation.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/encapsulation.md)
- **Imports**: import from package roots, not deep internal paths. Read [imports.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/imports.md)
- **One feature = one module**: implement a new core feature as its own self-contained PAS module. Read [feature-modules.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/feature-modules.md)

## PAS framework patterns

When writing services, modules, providers, or configurable classes, consult:

- **Dependency injection**: the PAS `inject()` system, when it is mandatory, logging via `injectLogger`, integrating external libraries, Angular bridging. Read [dependency-injection.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/dependency-injection.md)
- **Scoped providers** (`@pas/service-nestjs-api`): request-scope wiring with `createScopedInjector`, explicit `scope: requestScope`, `providers` terminology. Read [scoped-providers.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/scoped-providers.md)
- **Class inheritance and abstract contracts**: `implements` a pure contract, keep the inheritance slot for a real base. Read [class-inheritance.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/class-inheritance.md)
- **Configurable objects**: `@Configurable` + the `Configurable` base, injected options, `@PasModule` `configurables`. Read [configurable-objects.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/configurable-objects.md)

## Frontend data access

- **Calling a backend service**: talk to backends through the injected axios-based service client (never `HttpClient`/`fetch`/direct `axios`); no hard-coded URLs — base URL from config, relative paths in the client; new endpoint = new client method. Read [backend-service-calls.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/backend-service-calls.md)

## Frontend styling

- **Styling (SCSS)**: role-based class names, SCSS nesting over prefixes, `&` for states/variants. Read [styling.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/styling.md)

## Testing

- **Testing**: unit tests (Jest), ≥80% coverage, no end-to-end/HTTP-level tests, narrow test runs while iterating and `npm run verify` before the work is reported done. Read [testing.md](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/testing.md)

## Persisting remarks

When the user gives a remark, persist it so it is honored next time — never apply it only to the
file currently being edited:

- A rule about **how code is written** goes into the **code rules**. Default to the project-level
  `.agents/code-rules.md` (always writable; completes/overrides the global rules). Edit the global
  rules under [`reference/`](../../../node_modules/@pas/dev-guidelines/skills/pas-generate-code/reference/) (the topic file the rule belongs to) **only** when the
  active repository's `AGENTS.md` authorizes editing skill sources (e.g. a guidelines-authoring
  repo) — otherwise they ship **read-only** and edits to the linked `.agents/skills/` copy are
  lost on the next skill link. When authorized, edit the owning package's source (not the linked
  copy) and re-link.
- A requirement about **what the code must achieve** goes into the tracker spec or ticket (where they live:
  `docs/agents/issue-tracker.md`); the code-adjacent `SPEC.md` follows later through `pas-specupdate`.
