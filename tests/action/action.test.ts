import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { isDirectRun, runAction } from "../../src/action.js";

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
        INPUT_BASE: "origin/main",
        INPUT_AI: "false",
      },
      runCheck,
    });

    await expect(readFile(summaryPath, "utf8")).resolves.toContain("# AI Ship Gate: WARN");
    expect(exitCode).toBe(0);
    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: dir,
        base: "origin/main",
        format: "markdown",
        ai: false,
      }),
    );
  });

  it.each([
    ["true", true],
    [" TRUE ", true],
    ["false", false],
    [undefined, false],
  ])("parses INPUT_AI=%s as %s", async (inputAi, expected) => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "pass", findings: [] },
      rendered: "# AI Ship Gate: PASS\n",
      exitCode: 0,
    });

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        INPUT_AI: inputAi,
      },
      runCheck,
    });

    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expected,
      }),
    );
  });

  it("returns the exit code without writing when no GitHub step summary is configured", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "fail", findings: [] },
      rendered: "# AI Ship Gate: FAIL\n",
      exitCode: 1,
    });

    const exitCode = await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
      },
      runCheck,
    });

    await expect(stat(summaryPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(exitCode).toBe(1);
  });

  it("defaults the GitHub Action base to origin/main for checkout-based CI", async () => {
    const action = parse(await readFile("action.yml", "utf8"));

    expect(action.inputs.base.default).toBe("origin/main");
  });
});

describe("isDirectRun", () => {
  it("returns false when GitHub Actions imports the module instead of invoking it", () => {
    const actionPath = join(dir, "dist", "action.js");
    expect(isDirectRun(["node", join(dir, "other.js")], pathToFileURL(actionPath).href)).toBe(false);
  });

  it("returns true when the action module is invoked as the node entrypoint", () => {
    const actionPath = join(dir, "dist", "action.js");
    expect(isDirectRun(["node", actionPath], pathToFileURL(actionPath).href)).toBe(true);
  });
});
