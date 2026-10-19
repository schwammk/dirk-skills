#!/usr/bin/env bash
# Validate the Mermaid diagrams of an HTML report. Exit 0 = all parse, 1 = errors, 2 = setup problem.
set -euo pipefail

if [ $# -ne 1 ]; then echo "usage: $0 <report.html>" >&2; exit 2; fi
command -v node >/dev/null && command -v npm >/dev/null || { echo "skipping: node and npm are needed" >&2; exit 2; }
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' || { echo "setup: Node 24 or newer is needed" >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$1" ] || { echo "setup: report not found: $1" >&2; exit 2; }
REPORT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
[ -f "$SCRIPT_DIR/package-lock.json" ] || { echo "setup: the bundled package-lock.json is missing" >&2; exit 2; }
LOCK_HASH="$(node -e 'process.stdout.write(require("node:crypto").createHash("sha256").update(require("node:fs").readFileSync(process.argv[1])).digest("hex"))' "$SCRIPT_DIR/package-lock.json")"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/dirk-skills/mermaid-check/$LOCK_HASH"
mkdir -p "$CACHE"

if [ ! -f "$CACHE/.ready" ] || [ ! -d "$CACHE/node_modules/mermaid" ] || [ ! -d "$CACHE/node_modules/jsdom" ]; then
  (cp "$SCRIPT_DIR/package.json" "$SCRIPT_DIR/package-lock.json" "$CACHE/" \
    && npm ci --prefix "$CACHE" --ignore-scripts --no-audit --no-fund >&2 \
    && touch "$CACHE/.ready") || { echo "setup: locked validator npm ci failed" >&2; exit 2; }
fi

cp "$SCRIPT_DIR/validate-mermaid.mjs" "$CACHE/validate-mermaid.mjs"
(cd "$CACHE" && node validate-mermaid.mjs "$REPORT")
