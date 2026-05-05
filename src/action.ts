import { appendFile } from "node:fs/promises";
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
  const ai = env.INPUT_AI === "true";

  const result = await runCheck({
    cwd,
    base,
    format: "markdown",
    ai,
  });

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, result.rendered);
  }

  return result.exitCode;
}

if (process.env.GITHUB_ACTIONS) {
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
