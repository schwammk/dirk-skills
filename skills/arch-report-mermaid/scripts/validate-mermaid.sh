#!/usr/bin/env bash
# Validate the Mermaid diagrams of an HTML report. Exit 0 = all parse, 1 = errors, 2 = setup problem.
set -euo pipefail

if [ $# -ne 1 ]; then echo "usage: $0 <report.html>" >&2; exit 2; fi
command -v node >/dev/null && command -v npm >/dev/null || { echo "skipping: node and npm are needed" >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/dirk-skills/mermaid-check"
mkdir -p "$CACHE"

if [ ! -d "$CACHE/node_modules/mermaid" ] || [ ! -d "$CACHE/node_modules/jsdom" ]; then
  (cd "$CACHE" && { [ -f package.json ] || echo '{"private":true,"type":"module"}' > package.json; } \
    && npm install --silent mermaid@11 jsdom >&2) || { echo "skipping: npm install failed" >&2; exit 2; }
fi

cp "$SCRIPT_DIR/validate-mermaid.mjs" "$CACHE/validate-mermaid.mjs"
(cd "$CACHE" && node validate-mermaid.mjs "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")")
