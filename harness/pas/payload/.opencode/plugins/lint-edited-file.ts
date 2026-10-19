// Runs tools/agent-hooks/lint-edited-file.mjs after every edit or write and
// appends the lint report to the tool result, so the model sees it at once.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const editTools = new Set([
  "edit",
  "write",
  "multiedit",
  "patch",
  "apply_patch",
]);

function pathsOf(input: unknown): string[] {
  const value = input as
    | {
        path?: unknown;
        filePath?: unknown;
        file_path?: unknown;
        patchText?: unknown;
        patch?: unknown;
      }
    | undefined;
  const path = value?.path ?? value?.filePath ?? value?.file_path;
  if (typeof path === "string") return [path];
  const patch = value?.patchText ?? value?.patch;
  if (typeof patch !== "string") return [];
  return [
    ...new Set(
      [
        ...patch.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm),
      ].map((match) => match[1].trim()),
    ),
  ];
}

// The shape of the @opencode/plugin execute.after event this plugin reads;
// typed locally so the plugin needs no installed dependency.
type ToolContent = string | ReadonlyArray<{ type: string; text?: string }>;
interface ExecuteAfter {
  status: "completed" | "error";
  tool: string;
  input: unknown;
  result: { content?: ToolContent; [key: string]: unknown };
}

export default {
  id: "pas.lint-edited-file",
  async setup(ctx: {
    location: { directory: string };
    tool: {
      hook: (
        name: "execute.after",
        callback: (event: ExecuteAfter) => void,
      ) => Promise<unknown>;
    };
  }) {
    const script = fileURLToPath(
      new URL("../../tools/agent-hooks/lint-edited-file.mjs", import.meta.url),
    );
    await ctx.tool.hook("execute.after", (event) => {
      if (event.status !== "completed" || !editTools.has(event.tool)) return;
      const reports = pathsOf(event.input).flatMap((file) => {
        const run = spawnSync("node", [script, file], {
          cwd: ctx.location.directory,
          encoding: "utf8",
        });
        return run.status === 0
          ? []
          : [
              `${run.stdout ?? ""}${run.stderr ?? ""}${run.error?.message ?? ""}`.trim(),
            ];
      });
      if (!reports.length) return;
      const report = reports.join("\n\n");
      const content = event.result.content;
      event.result = {
        ...event.result,
        content:
          typeof content === "string" || content === undefined
            ? `${content ?? ""}\n\n${report}`
            : [...content, { type: "text", text: `\n\n${report}` }],
      };
    });
  },
};
