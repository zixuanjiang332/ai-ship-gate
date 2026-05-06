import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GateReport } from "./domain/types.js";
import { renderActionSummary, summarizeFindings } from "./reporters/actionSummary.js";
import { runCheck as defaultRunCheck } from "./run.js";

interface ActionOptions {
  env?: Record<string, string | undefined>;
  runCheck?: typeof defaultRunCheck;
}

export async function runAction(options: ActionOptions = {}): Promise<number> {
  const env = options.env ?? process.env;
  const runCheck = options.runCheck ?? defaultRunCheck;
  const cwd = env.GITHUB_WORKSPACE ?? process.cwd();
  const base = env.INPUT_BASE || undefined;
  const ai = env.INPUT_AI?.trim().toLowerCase() === "true";

  const result = await runCheck({
    cwd,
    base,
    format: "markdown",
    ai,
  });

  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, renderActionSummary(result.report));
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, renderActionOutputs(result.report));

  return result.exitCode;
}

function renderActionOutputs(report: GateReport): string {
  const counts = summarizeFindings(report);
  return [
    `verdict=${report.verdict}`,
    `findings-count=${counts.findingsCount}`,
    `fail-count=${counts.failCount}`,
    `warn-count=${counts.warnCount}`,
    "",
  ].join("\n");
}

export function isDirectRun(argv: string[], importMetaUrl: string): boolean {
  return argv[1] !== undefined && fileURLToPath(importMetaUrl) === resolve(argv[1]);
}

if (isDirectRun(process.argv, import.meta.url)) {
  runAction()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
