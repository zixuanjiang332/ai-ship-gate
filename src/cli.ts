#!/usr/bin/env node
import { Command } from "commander";
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
    await runCheck({
      cwd: process.cwd(),
      base: options.base,
      format: options.format,
      ai: options.ai,
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
