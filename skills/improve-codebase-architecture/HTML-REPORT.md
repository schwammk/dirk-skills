# HTML Report Format

Render the architectural review as one self-contained HTML file in the OS temp directory. Tailwind and Mermaid come from CDNs. Use Mermaid for graph-shaped relationships and hand-built divs or inline SVG for editorial visuals. Mix the two.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review for {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
    </script>
    <style>
      .seam {
        stroke-dasharray: 4 4;
      }
      .leak {
        stroke: #dc2626;
      }
      .deep {
        background: linear-gradient(135deg, #0f172a, #1e293b);
      }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Header

Show the repo name, date, and a compact legend: solid box = module, dashed line = seam, red arrow = leakage, thick dark box = deep module. Start with candidates, not an introduction.

## Candidate card

Each candidate is an `<article>`. Use the required content fields in [SKILL.md](SKILL.md) as the card's content contract; this file owns presentation, not a second comparison recipe.

- **Title:** short, naming the proposed deepening.
- **Badge row:** `Strong` = emerald, `Worth exploring` = amber, `Speculative` = slate. A dependency-category tag may describe existing evidence, not claim an unverified pattern implementation.
- **Files:** monospaced, `font-mono text-sm`.
- **Before / After:** two side-by-side columns showing where knowledge currently lives and might move.
- **Problem, forces, and provisional solution:** compact bullets separating observations from hypotheses.
- **Reference and alternatives:** a compact explanation and comparison table. Keep the contract, limits, source links, costs, and useful circumstances legible. The diagram supplements these fields; pattern labels alone do not fill them.
- **Wins:** short locality, leverage, and testability bullets.
- **ADR callout:** an amber-tinted line when a real conflict warrants reopening a decision.

Keep the visuals prominent and prose plain. Redraw an unclear diagram rather than burying it in explanation; give the comparison enough space to explain why another option could win.

## Diagram patterns

### Mermaid graph

Use a flowchart or graph for dependencies and call flow, or a sequence diagram for interactions. Wrap it in a styled card and use class definitions to distinguish leakage from the deep module.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### Hand-built boxes and arrows

Use bordered divs for modules and inline SVG lines or paths for arrows. This can show one thick-bordered deep module with faded internals when Mermaid's layout fights the intended comparison.

### Cross-section

Stack horizontal bands for a chain of shallow modules. Compare the thin forwarding steps with a consolidated responsibility.

### Interface/implementation diagram

Use separate rectangles to show the caller-visible knowledge and the behavior hidden behind the interface. Illustration size communicates the design claim; it is not a measured lines-of-code depth score.

### Call-graph collapse

Compare a visible tree of calls with one module whose internal calls are faded. Make clear which ordering or assembly knowledge actually leaves the callers.

## Style guidance

- Use generous whitespace and an editorial layout rather than a dashboard.
- Use color sparingly: one accent plus red leakage and amber warnings.
- Keep before/after diagrams around 320 pixels tall when practical.
- Use small uppercase module labels so the visuals read as schematic.
- Limit scripts to the Tailwind CDN and Mermaid import; no application code is needed.

## Top recommendation

Use one larger card with the candidate name, why it is worth exploring first, the open force or fact to settle, and an anchor link to its card. Render the required next-step handoff beneath it. This recommends an exploration, not a settled interface.

## Tone

Use plain English and the codebase-design terms: module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality. Use the domain glossary for domain concepts. Explain established pattern terms when they help compare the problem, rather than replacing the domain vocabulary.

Wins name the gain: "locality: ordering knowledge concentrates", "leverage: one interface, three callers", or "tests cross the caller's seam". State observations directly and label provisional designs, unknown facts, and conditional recommendations explicitly.
