// Stylish output plus, per rule that fired, how to fix it. Lint runs read by
// coding agents get the repo's correction guidance next to the error.
const { ESLint } = require("eslint");

const suppression =
  "If the rule must not apply here, suppress the one line with `// eslint-disable-next-line <rule> -- <reason>`; the reason is reviewed. Do not raise thresholds in eslint.config.mjs.";

const hints = {
  "max-lines":
    "Split the file along a seam: move one cohesive responsibility (a class, or helpers with their own data) into a sibling file and import it. Blank lines and comments are not counted, so squeezing lines does not help.",
  "max-lines-per-function":
    "Extract the steps of the function into well-named private methods, so the function reads as a sequence of calls.",
  complexity:
    "Extract branches into named methods, return early, or replace an if/switch chain with a lookup table.",
  "max-depth":
    "Return or continue early, or extract the inner block into a method.",
  "max-params":
    "Group related parameters into one options object with a named type.",
  "no-console":
    "Log through the PAS logger (`injectLogger`, see the pas-generate-code skill, best-practices.md).",
  "@typescript-eslint/no-unused-vars":
    "Remove the unused name. Prefix it with `_` only when a signature requires the parameter.",
  "@nx/enforce-module-boundaries":
    "Layers: app may import client and types, client and service may import types, types imports no project. Import through the aliases in tsconfig.base.json. Move a type that two layers need into service/types.",
  "no-restricted-syntax": "The message above says what to change.",
};

module.exports = async function agentFormatter(results, context) {
  const stylish = await new ESLint().loadFormatter("stylish");
  const output = await stylish.format(results, context);
  const fired = new Set(
    results.flatMap((result) =>
      result.messages.map((message) => message.ruleId),
    ),
  );
  const guidance = [...fired]
    .filter((rule) => rule && hints[rule])
    .map((rule) => `  ${rule}: ${hints[rule]}`);
  if (guidance.length === 0) return output;
  return `${output}\nHow to fix:\n${guidance.join("\n")}\n  ${suppression}\n`;
};
