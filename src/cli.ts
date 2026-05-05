#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { defaultConfig } from "./config/defaults.js";
import { runCheck } from "./run.js";

const program = new Command();

program
  .name("shipgate")
  .description("A deterministic release gate for AI-generated code.")
  .version("0.1.0");

program
  .command("check")
  .description("Check the current git diff for release risk.")
  .option("--base <ref>", "Base ref to compare against")
  .option("--format <format>", "Output format: terminal, json, markdown", "terminal")
  .option("--ai", "Enable optional AI explanation", false)
  .action(async (options: { base?: string; format: "terminal" | "json" | "markdown"; ai: boolean }) => {
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
  .description("Create a shipgate.config.yaml file.")
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
    await writeFile("shipgate.config.yaml", yaml, { flag: "wx" });
    console.log("Created shipgate.config.yaml");
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
