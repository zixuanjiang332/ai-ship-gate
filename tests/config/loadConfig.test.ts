import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "../../src/config/defaults.js";
import { loadConfig } from "../../src/config/loadConfig.js";

let dir: string;

beforeEach(async () => {
  dir = join(tmpdir(), `shipgate-config-${Date.now()}-${Math.random()}`);
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
      join(dir, "shipgate.config.yaml"),
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
    await writeFile(join(dir, "shipgate.config.yaml"), "failOn: sometimes\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid failOn");
  });
});
