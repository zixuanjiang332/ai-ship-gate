import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck as defaultRunCheck } from "./run.js";
export async function runAction(options = {}) {
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
    if (env.GITHUB_STEP_SUMMARY) {
        await appendFile(env.GITHUB_STEP_SUMMARY, result.rendered);
    }
    return result.exitCode;
}
export function isDirectRun(argv, importMetaUrl) {
    return argv[1] !== undefined && fileURLToPath(importMetaUrl) === resolve(argv[1]);
}
if (isDirectRun(process.argv, import.meta.url)) {
    runAction()
        .then((exitCode) => {
        process.exitCode = exitCode;
    })
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=action.js.map