export default {
  "*.{ts,mts,cts,js,mjs,cjs}": [
    "prettier --write --ignore-unknown",
    "eslint --flag v10_config_lookup_from_file --no-warn-ignored --format ./tools/eslint/agent-formatter.cjs",
  ],
  "*.{json,md,html,scss,css,yml,yaml}": "prettier --write --ignore-unknown",
  "CLAUDE.md": () => "node tools/instructions-lint.mjs",
};
