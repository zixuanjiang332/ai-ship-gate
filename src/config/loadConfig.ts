import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import type { ReleaseGuardConfig } from "../domain/types.js";
import { defaultConfig } from "./defaults.js";

type CheckName = keyof ReleaseGuardConfig["checks"];

interface ConfigInput {
  failOn?: ReleaseGuardConfig["failOn"];
  ai?: {
    enabled?: boolean;
  };
  checks?: Partial<Record<CheckName, boolean>>;
}

const checkNames: CheckName[] = ["tests", "dependencies", "ci", "docker", "env", "security"];

export const CONFIG_FILE_NAME = "releaseguard.config.yaml";

export async function loadConfig(cwd: string): Promise<ReleaseGuardConfig> {
  const path = join(cwd, CONFIG_FILE_NAME);
  let raw: string;

  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return structuredClone(defaultConfig);
    }
    throw error;
  }

  const parsed = YAML.parse(raw) as unknown;
  return mergeConfig(validateConfig(parsed));
}

export function mergeConfig(config: ConfigInput): ReleaseGuardConfig {
  const checks = { ...defaultConfig.checks };

  for (const checkName of checkNames) {
    const value = config.checks?.[checkName];
    if (value !== undefined) {
      checks[checkName] = value;
    }
  }

  return {
    failOn: config.failOn ?? defaultConfig.failOn,
    ai: {
      enabled: config.ai?.enabled ?? defaultConfig.ai.enabled,
    },
    checks,
  };
}

function validateConfig(config: unknown): ConfigInput {
  if (config === null) {
    return {};
  }

  if (!isPlainObject(config)) {
    throw new Error("Invalid config value. Expected object.");
  }

  if (config.failOn !== undefined && config.failOn !== "warn" && config.failOn !== "fail") {
    throw new Error("Invalid failOn value. Expected 'warn' or 'fail'.");
  }

  const input: ConfigInput = {
    failOn: config.failOn,
  };

  if (config.ai !== undefined) {
    if (!isPlainObject(config.ai)) {
      throw new Error("Invalid ai value. Expected object.");
    }

    if (config.ai.enabled !== undefined && typeof config.ai.enabled !== "boolean") {
      throw new Error("Invalid ai.enabled value. Expected boolean.");
    }

    input.ai = {
      enabled: config.ai.enabled,
    };
  }

  if (config.checks !== undefined) {
    if (!isPlainObject(config.checks)) {
      throw new Error("Invalid checks value. Expected object.");
    }

    input.checks = {};

    for (const checkName of checkNames) {
      const value = config.checks[checkName];
      if (value !== undefined && typeof value !== "boolean") {
        throw new Error(`Invalid checks.${checkName} value. Expected boolean.`);
      }
      input.checks[checkName] = value;
    }
  }

  return input;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
