import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  ...nx.configs["flat/typescript"],
  ...nx.configs["flat/javascript"],
  {
    ignores: ["**/dist", "**/out-tsc"],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
          depConstraints: [
            {
              sourceTag: "pas-app",
              onlyDependOnLibsWithTags: ["pas-client", "pas-types"],
            },
            {
              sourceTag: "pas-service",
              onlyDependOnLibsWithTags: ["pas-types"],
            },
            {
              sourceTag: "pas-client",
              onlyDependOnLibsWithTags: ["pas-types"],
            },
            { sourceTag: "pas-types", onlyDependOnLibsWithTags: [] },
            { sourceTag: "pas-bundle", onlyDependOnLibsWithTags: ["*"] },
          ],
        },
      ],
    },
  },
  {
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.cts",
      "**/*.mts",
      "**/*.js",
      "**/*.jsx",
      "**/*.cjs",
      "**/*.mjs",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name=/^(it|test|describe)$/][callee.property.name='only']",
          message:
            "A focused test hides every other test in the file. Remove .only before committing.",
        },
        {
          selector:
            "CallExpression[callee.object.name=/^(it|test|describe)$/][callee.property.name='skip'], CallExpression[callee.name=/^(xit|xtest|xdescribe|fit|fdescribe)$/]",
          message:
            "A skipped or focused test stops checking its behaviour. Fix the test or the code; if the test must wait, record why in the ticket.",
        },
      ],
      "max-params": ["error", 4],
    },
  },
  {
    files: ["**/*.ts"],
    ignores: [
      "**/*.spec.ts",
      "**/*.test-support.ts",
      "**/test/**",
      "**/src/main.ts",
    ],
    rules: {
      "no-console": "error",
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 15],
      "max-depth": ["error", 4],
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test-support.ts", "**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
