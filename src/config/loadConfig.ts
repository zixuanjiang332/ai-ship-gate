import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import type { ShipGateConfig } from "../domain/types.js";
import { defaultConfig } from "./defaults.js";

export async function loadConfig(cwd: string): Promise<ShipGateConfig> {
  const path = join(cwd, "shipgate.config.yaml");
  let raw: string;

  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return structuredClone(defaultConfig);
    }
    throw error;
  }

  const parsed = YAML.parse(raw) as Partial<ShipGateConfig> | null;
  return mergeConfig(parsed ?? {});
}

export function mergeConfig(config: Partial<ShipGateConfig>): ShipGateConfig {
  if (config.failOn !== undefined && config.failOn !== "warn" && config.failOn !== "fail") {
    throw new Error("Invalid failOn value. Expected 'warn' or 'fail'.");
  }

  return {
    failOn: config.failOn ?? defaultConfig.failOn,
    ai: {
      enabled: config.ai?.enabled ?? defaultConfig.ai.enabled,
    },
    checks: {
      tests: config.checks?.tests ?? defaultConfig.checks.tests,
      dependencies: config.checks?.dependencies ?? defaultConfig.checks.dependencies,
      ci: config.checks?.ci ?? defaultConfig.checks.ci,
      docker: config.checks?.docker ?? defaultConfig.checks.docker,
      env: config.checks?.env ?? defaultConfig.checks.env,
      security: config.checks?.security ?? defaultConfig.checks.security,
    },
  };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
