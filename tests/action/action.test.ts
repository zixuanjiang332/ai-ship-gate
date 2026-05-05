import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAction } from "../../src/action.js";

let dir: string;
let summaryPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "shipgate-action-"));
  summaryPath = join(dir, "summary.md");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runAction", () => {
  it("writes the rendered report to the GitHub step summary", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "warn", findings: [] },
      rendered: "# AI Ship Gate: WARN\n",
      exitCode: 0,
    });

    const exitCode = await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_STEP_SUMMARY: summaryPath,
        INPUT_BASE: "main",
        INPUT_AI: "false",
      },
      runCheck,
    });

    await expect(readFile(summaryPath, "utf8")).resolves.toContain("# AI Ship Gate: WARN");
    expect(exitCode).toBe(0);
    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: dir,
        base: "main",
        format: "markdown",
        ai: false,
      }),
    );
  });
});
