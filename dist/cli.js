#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, InvalidArgumentError } from "commander";
import { defaultConfig } from "./config/defaults.js";
import { runCheck } from "./run.js";
const program = new Command();
const outputFormats = ["terminal", "json", "markdown"];
program
    .name("releaseguard")
    .description("A deterministic PR diff release gate for AI-generated code.")
    .version("0.1.1");
program
    .command("check")
    .description("Check the current git diff for release risk.")
    .option("--base <ref>", "Base ref to compare against")
    .option("--format <format>", "Output format: terminal, json, markdown", parseOutputFormat, "terminal")
    .option("--ai", "Enable optional AI explanation", false)
    .action(async (options) => {
    const result = await runCheck({
        cwd: process.cwd(),
        base: options.base,
        format: options.format,
        ai: options.ai,
    });
    process.exitCode = result.exitCode;
});
program
    .command("init")
    .description("Create a releaseguard.config.yaml file.")
    .action(async () => {
    const yaml = [
        `failOn: ${defaultConfig.failOn}`,
        "ai:",
        `  enabled: ${defaultConfig.ai.enabled}`,
        "checks:",
        `  tests: ${defaultConfig.checks.tests}`,
        `  dependencies: ${defaultConfig.checks.dependencies}`,
        `  ci: ${defaultConfig.checks.ci}`,
        `  docker: ${defaultConfig.checks.docker}`,
        `  env: ${defaultConfig.checks.env}`,
        `  security: ${defaultConfig.checks.security}`,
        "",
    ].join("\n");
    await writeFile("releaseguard.config.yaml", yaml, { flag: "wx" });
    console.log("Created releaseguard.config.yaml");
});
export function parseOutputFormat(value) {
    if (isOutputFormat(value)) {
        return value;
    }
    throw new InvalidArgumentError(`Invalid format '${value}'. Expected one of: ${outputFormats.join(", ")}.`);
}
if (isCliEntry()) {
    program.parseAsync(process.argv).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exitCode = 1;
    });
}
function isOutputFormat(value) {
    return outputFormats.includes(value);
}
function isCliEntry() {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
//# sourceMappingURL=cli.js.map