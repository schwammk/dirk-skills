---
name: arch-report-mermaid
description: Use when writing the HTML report of improve-codebase-architecture, or any self-contained HTML page with Mermaid diagrams, before opening it for the user. Gives the syntax pitfalls that make diagrams fail with "Syntax error in text" and a validator that checks every diagram offline.
---

# Mermaid diagrams in generated reports

The architecture report renders Mermaid in the browser. A bad diagram shows only
"Syntax error in text" there, and the author never sees it. Check every diagram
before telling the user to open the file.

## Validate (always, before `xdg-open`)

Run `bash scripts/validate-mermaid.sh <report.html>` (relative to this skill's base
directory). It parses every `<pre class="mermaid">` block with the real Mermaid
parser and prints the block number and the error. Exit 0 = all diagrams parse,
exit 1 = fix and run again; exit 2 = setup failed, not a diagram verdict. It needs
Node 24 or newer and npm. The first run uses the bundled lockfile to install
Mermaid and jsdom into a lock-specific directory under
`${XDG_CACHE_HOME:-$HOME/.cache}/dirk-skills/mermaid-check`; later runs are offline.
It does not render, so layout is still the user's to judge.

Say in one line which result you got. If the script cannot run (no node, no
network on first use), say so and keep to the rules below.

## Rules that prevent the usual errors

- **Dotted edge plus pipe label.** `A -.leak.-> |"x"| B` is invalid: the
  parser rejects a pipe label after an arrow that already carries text. Put the
  label between the dots instead: `A -. "label text" .-> B`. This caused the
  failures in the 2026-10 report: every "Before" diagram with a labelled leak
  edge broke, every "After" diagram rendered.
- **Dotted edge, no label.** Write `A -. leak .-> B` (spaces around the text).
  The unspaced `A -.leak.-> B` happens to parse, but do not rely on it.
- **Pipe labels** belong to plain arrows: `A -->|"x"| B`, `A -.-> |"x"| B`,
  `A -.-|"x"| B` all parse.
- **Quote node labels** that hold punctuation: `A["Container: f(x), ~31 sites"]`.
  An unquoted `(` or `)` breaks the parser (`A[f(x)]` fails); quote every label
  that is more than plain words.
- **Escape in HTML.** The diagram text sits inside `<pre>`. Write `&amp;` for `&`,
  `&lt;` for `<`. The validator decodes these the way the browser does.
- **Node ids.** Short ids (`A`, `CV`, `PC`). Never the bare word `end` (lowercase).
- **Leak styling.** `classDef leak stroke:#dc2626,stroke-width:2px;` and
  `class SC leak`. A `classDef` with no `class` line is allowed.
- **One graph, ~8 nodes.** Keep each diagram small. Large ones fail more and read worse.

## Report rules stay in the other skill

Card layout, badges, vocabulary and the "do not propose interfaces" rule live in
`improve-codebase-architecture` (`HTML-REPORT.md`). This skill adds only the
check that the diagrams parse.
