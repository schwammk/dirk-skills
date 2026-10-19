#!/usr/bin/env bash
# Informational only: prints import cycles of the TypeScript code in the current repo.
# Always exits 0. Never leaves files behind in the repo.
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT="${TMPDIR:-/tmp}/arch-cycles-$$.json"

# Locate arch4ts only through an explicit executable path or PATH.
BIN="${ARCH4TS_BIN:-}"
if [ -z "$BIN" ] && command -v arch4ts >/dev/null 2>&1; then BIN="arch4ts"; fi
if [ -z "$BIN" ]; then echo "arch-cycles: arch4ts not found (set ARCH4TS_BIN); skipping cycle data."; exit 0; fi
command -v jq >/dev/null 2>&1 || { echo "arch-cycles: jq not found; skipping cycle data."; exit 0; }

cd "$ROOT" || exit 0
TMPCFG=0
trap '[ "$TMPCFG" = 1 ] && rm -f "$ROOT/tsconfig.json"; rm -f "$OUT"' EXIT

# arch4ts reads only <root>/tsconfig.json. Nx workspaces keep the path aliases in
# tsconfig.base.json, so write a temporary root tsconfig.json that extends it.
if [ -e tsconfig.json ]; then
  echo "arch-cycles: root tsconfig.json exists; using it as is."
else
  BASE=""; [ -f tsconfig.base.json ] && BASE="tsconfig.base.json"
  INCLUDE=""
  for d in packages apps libs src; do
    [ -d "$d" ] && INCLUDE="${INCLUDE:+$INCLUDE, }\"$d/**/*.ts\", \"$d/**/*.tsx\""
  done
  [ -n "$INCLUDE" ] || { echo "arch-cycles: no packages/, apps/, libs/ or src/ folder; skipping."; exit 0; }
  EXTENDS=""
  [ -n "$BASE" ] && EXTENDS="\"extends\": \"./$BASE\", "
  printf '{ %s"include": [%s], "exclude": ["**/*.spec.ts", "**/*.test.ts", "**/node_modules", "**/dist"] }\n' "$EXTENDS" "$INCLUDE" > tsconfig.json
  TMPCFG=1
fi

if ! "$BIN" dump . --out "$OUT" >/dev/null 2>&1; then echo "arch-cycles: arch4ts failed; skipping cycle data."; exit 0; fi
jq -r '"modules: \(.architecture.graph.nodes|length)  imports: \(.architecture.graph.edges|length)  cycles: \(.layering.cycles|length)  feedback edges: \(.layering.feedbackEdges|length)"' "$OUT"
jq -r '.layering.cycles[] | "cycle: " + join(" -> ")' "$OUT"
jq -r '.layering.feedbackEdges[] | "feedback edge: \(.from) -> \(.to) (line \(.lines|join(",")))"' "$OUT"
exit 0
