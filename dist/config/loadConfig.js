import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { defaultConfig } from "./defaults.js";
const checkNames = ["tests", "dependencies", "ci", "docker", "env", "security"];
export async function loadConfig(cwd) {
    const path = join(cwd, "shipgate.config.yaml");
    let raw;
    try {
        raw = await readFile(path, "utf8");
    }
    catch (error) {
        if (isMissingFileError(error)) {
            return structuredClone(defaultConfig);
        }
        throw error;
    }
    const parsed = YAML.parse(raw);
    return mergeConfig(validateConfig(parsed));
}
export function mergeConfig(config) {
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
function validateConfig(config) {
    if (config === null) {
        return {};
    }
    if (!isPlainObject(config)) {
        throw new Error("Invalid config value. Expected object.");
    }
    if (config.failOn !== undefined && config.failOn !== "warn" && config.failOn !== "fail") {
        throw new Error("Invalid failOn value. Expected 'warn' or 'fail'.");
    }
    const input = {
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
function isMissingFileError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
function isPlainObject(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
//# sourceMappingURL=loadConfig.js.map