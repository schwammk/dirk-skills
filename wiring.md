# Global wiring instructions

Paste into your global `~/.claude/CLAUDE.md` (Claude Code) and global opencode
rules file (`~/.config/opencode/AGENTS.md`). Keep the phrasing "call the Skill
tool with" — it is the phrasing most likely to actually fire the invocation.

```md
## Pattern-language discipline

- When resolving an architectural or integration decision in a grilling session
  or wayfinder decision ticket, call the Skill tool with "pattern-decision"
  before recording the ADR.
- When reviewing or implementing code governed by a pattern-named ADR, call the
  Skill tool with "pattern-review".
- Pattern vocabulary belongs in ADRs and ticket pointers, never in the domain
  glossary (CONTEXT.md).
```
