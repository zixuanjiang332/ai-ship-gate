import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "../../src/config/defaults.js";
import { loadConfig } from "../../src/config/loadConfig.js";

let dir: string;

beforeEach(async () => {
  dir = join(tmpdir(), `releaseguard-config-${Date.now()}-${Math.random()}`);
  await mkdir(dir, { recursive: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns defaults when no config exists", async () => {
    await expect(loadConfig(dir)).resolves.toEqual(defaultConfig);
  });

  it("merges user config over defaults", async () => {
    await writeFile(
      join(dir, "releaseguard.config.yaml"),
      "failOn: warn\nai:\n  enabled: true\nchecks:\n  docker: false\n",
    );

    await expect(loadConfig(dir)).resolves.toEqual({
      ...defaultConfig,
      failOn: "warn",
      ai: { enabled: true },
      checks: {
        ...defaultConfig.checks,
        docker: false,
      },
    });
  });

  it("rejects invalid failOn values", async () => {
    await writeFile(join(dir, "releaseguard.config.yaml"), "failOn: sometimes\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid failOn");
  });

  it("rejects invalid ai values", async () => {
    await writeFile(join(dir, "releaseguard.config.yaml"), "ai: true\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid ai value");
  });

  it("rejects invalid checks values", async () => {
    await writeFile(join(dir, "releaseguard.config.yaml"), "checks: []\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid checks value");
  });

  it("rejects quoted check booleans", async () => {
    await writeFile(join(dir, "releaseguard.config.yaml"), 'checks:\n  docker: "false"\n');
    await expect(loadConfig(dir)).rejects.toThrow("Invalid checks.docker value");
  });

  it("returns deeply cloned default config", async () => {
    const first = await loadConfig(dir);
    first.ai.enabled = true;
    first.checks.docker = false;

    const second = await loadConfig(dir);

    expect(second).toEqual(defaultConfig);
    expect(defaultConfig.ai.enabled).toBe(false);
    expect(defaultConfig.checks.docker).toBe(true);
  });

  it("preserves explicit false values for multiple checks", async () => {
    await writeFile(
      join(dir, "releaseguard.config.yaml"),
      "checks:\n  tests: false\n  docker: false\n  security: false\n",
    );

    await expect(loadConfig(dir)).resolves.toEqual({
      ...defaultConfig,
      checks: {
        ...defaultConfig.checks,
        tests: false,
        docker: false,
        security: false,
      },
    });
  });
});
