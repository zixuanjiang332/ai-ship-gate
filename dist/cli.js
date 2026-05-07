#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, InvalidArgumentError } from "commander";
import { defaultConfig } from "./config/defaults.js";
import { createConsoleServer } from "./console/server.js";
import { runCheck } from "./run.js";
const outputFormats = ["terminal", "json", "markdown", "sarif"];
export function buildProgram() {
    const program = new Command();
    program
        .name("releaseguard")
        .description("A deterministic PR diff release gate for AI-generated code.")
        .version("0.6.0");
    program
        .command("check")
        .description("Check the current git diff for release risk.")
        .option("--base <ref>", "Base ref to compare against")
        .option("--format <format>", "Output format: terminal, json, markdown, sarif", parseOutputFormat, "terminal")
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
        .command("console")
        .description("Start the local browser console.")
        .option("--port <port>", "Port to listen on", parsePort, 4319)
        .action(async (options) => {
        const server = await createConsoleServer({ port: options.port });
        const address = server.address();
        const resolvedPort = typeof address === "object" && address ? address.port : options.port;
        console.log(`ReleaseGuard Local Console: http://127.0.0.1:${resolvedPort}`);
        console.log("Press Ctrl+C to stop the server.");
        process.on("SIGINT", () => {
            server.close(() => process.exit());
        });
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
    return program;
}
export function parseOutputFormat(value) {
    if (isOutputFormat(value)) {
        return value;
    }
    throw new InvalidArgumentError(`Invalid format '${value}'. Expected one of: ${outputFormats.join(", ")}.`);
}
function parsePort(value) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new InvalidArgumentError("Invalid port. Expected an integer between 0 and 65535.");
    }
    return port;
}
if (isCliEntry()) {
    buildProgram().parseAsync(process.argv).catch((error) => {
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