#!/usr/bin/env bash
# Symlink every skill in skills/ into global skill directories so both
# opencode (reads ~/.claude/skills) and Claude Code (reads ~/.claude/skills)
# discover them. Pass extra targets to link elsewhere, e.g. ~/.agents/skills
# for Codex. Re-run after adding or renaming skills.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$SCRIPT_DIR/../skills"

TARGETS=("$HOME/.claude/skills")
for arg in "$@"; do TARGETS+=("$arg"); done

for target in "${TARGETS[@]}"; do
  mkdir -p "$target"
  for skill_dir in "$SKILLS_DIR"/*/; do
    name="$(basename "$skill_dir")"
    link="$target/$name"
    if [ -L "$link" ]; then
      rm "$link"
    elif [ -e "$link" ]; then
      echo "skip $link (exists and is not a symlink)" >&2
      continue
    fi
    ln -s "$(cd "$skill_dir" && pwd)" "$link"
    echo "linked $link -> $skill_dir"
  done
done
