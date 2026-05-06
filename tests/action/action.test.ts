import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { isDirectRun, runAction } from "../../src/action.js";
import type { ProjectMetadata } from "../../src/domain/types.js";

let dir: string;
let summaryPath: string;
let outputPath: string;
const execFileAsync = promisify(execFile);
const baseMetadata: ProjectMetadata = {
  hasPackageJson: true,
  hasPackageLock: true,
  hasPnpmLock: false,
  hasYarnLock: false,
  hasPyproject: false,
  hasRequirements: false,
  hasGoMod: false,
  hasCargoToml: false,
  hasPomXml: false,
  hasDockerfile: false,
  hasCompose: false,
  hasGitHubActions: true,
  hasEnvExample: true,
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "releaseguard-action-"));
  summaryPath = join(dir, "summary.md");
  outputPath = join(dir, "outputs.txt");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runAction", () => {
  it("writes the action summary to the GitHub step summary", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: {
        verdict: "warn",
        findings: [
          {
            id: "tests.missing-related-tests",
            severity: "warn",
            title: "Source changed without tests",
            message: "Source changed but tests did not.",
            files: ["src/app.ts"],
            suggestion: "Add tests.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: WARN\n",
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

    await expect(readFile(summaryPath, "utf8")).resolves.toContain("# ReleaseGuard AI: WARN");
    await expect(readFile(summaryPath, "utf8")).resolves.toContain("| WARN | 1 | 0 | 1 | 0 |");
    await expect(readFile(summaryPath, "utf8")).resolves.toContain("## Top Findings");
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

  it("writes verdict and finding counts to GitHub Action outputs", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: {
        verdict: "fail",
        findings: [
          {
            id: "security.secret-in-diff",
            severity: "fail",
            title: "Secret-like value in diff",
            message: "The diff contains a token-like value.",
            files: ["src/config.ts"],
            suggestion: "Remove it.",
          },
          {
            id: "tests.missing-related-tests",
            severity: "warn",
            title: "Source changed without tests",
            message: "Source changed but tests did not.",
            files: ["src/app.ts"],
            suggestion: "Add tests.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: FAIL\n",
      exitCode: 1,
    });

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_OUTPUT: outputPath,
      },
      runCheck,
    });

    await expect(readFile(outputPath, "utf8")).resolves.toBe(
      ["verdict=fail", "findings-count=2", "fail-count=1", "warn-count=1", ""].join("\n"),
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
      rendered: "# ReleaseGuard AI: PASS\n",
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
      rendered: "# ReleaseGuard AI: FAIL\n",
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

  it("declares stable outputs for workflow consumers", async () => {
    const action = parse(await readFile("action.yml", "utf8"));

    expect(Object.keys(action.outputs)).toEqual(["verdict", "findings-count", "fail-count", "warn-count"]);
    expect(action.outputs.verdict.description).toContain("Final ReleaseGuard verdict");
  });

  it("declares a pr-comment input with a safe default", async () => {
    const action = parse(await readFile("action.yml", "utf8"));

    expect(action.inputs["pr-comment"].default).toBe("off");
    expect(action.inputs["pr-comment"].description).toContain("pull request comment");
  });

  it("declares a review-comments input with a safe default", async () => {
    const action = parse(await readFile("action.yml", "utf8"));

    expect(action.inputs["review-comments"].default).toBe("off");
    expect(action.inputs["review-comments"].description).toContain("inline review comments");
  });

  it("does not publish pull request comments by default", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [],
        metadata: baseMetadata,
      },
      report: { verdict: "warn", findings: [] },
      rendered: "# ReleaseGuard AI: WARN\n",
      exitCode: 0,
    });
    const publishPrComment = vi.fn();

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
      },
      runCheck,
      publishPrComment,
    });

    expect(publishPrComment).not.toHaveBeenCalled();
  });

  it("does not publish inline review comments by default", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [],
        metadata: baseMetadata,
      },
      report: { verdict: "fail", findings: [] },
      rendered: "# ReleaseGuard AI: FAIL\n",
      exitCode: 1,
    });
    const publishReviewComments = vi.fn();

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
      },
      runCheck,
      publishReviewComments,
    });

    expect(publishReviewComments).not.toHaveBeenCalled();
  });

  it("publishes a pull request comment when explicitly enabled for pull_request events", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [],
        metadata: baseMetadata,
      },
      report: {
        verdict: "fail",
        findings: [
          {
            id: "security.secret-in-diff",
            severity: "fail",
            title: "Secret-like value in diff",
            message: "The diff contains a token-like value.",
            files: ["src/config.ts"],
            suggestion: "Remove it.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: FAIL\n",
      exitCode: 1,
    });
    const publishPrComment = vi.fn().mockResolvedValue(undefined);
    const eventPath = join(dir, "event.json");

    await writeFile(
      eventPath,
      JSON.stringify({
        pull_request: {
          number: 42,
        },
        repository: {
          owner: { login: "zixuanjiang332" },
          name: "releaseguard-ai",
        },
      }),
    );

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_TOKEN: "token",
        INPUT_PR_COMMENT: "always",
      },
      runCheck,
      publishPrComment,
    });

    expect(publishPrComment).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        issueNumber: 42,
        token: "token",
      }),
      expect.objectContaining({
        verdict: "fail",
      }),
    );
  });

  it("publishes smart-mode review comments only for supported anchored findings", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [
          {
            path: "src/auth.ts",
            status: "modified",
            patch: "@@ -1 +1,2 @@\n export const x = 1;\n+export const y = 2;\n",
          },
        ],
        metadata: baseMetadata,
      },
      report: {
        verdict: "warn",
        findings: [
          {
            id: "tests.missing-related-tests",
            severity: "warn",
            title: "Source changed without tests",
            message: "Source changed but tests did not.",
            files: ["src/auth.ts"],
            suggestion: "Add tests.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: WARN\n",
      exitCode: 0,
    });
    const publishReviewComments = vi.fn().mockResolvedValue(undefined);
    const eventPath = join(dir, "event.json");

    await writeFile(
      eventPath,
      JSON.stringify({
        pull_request: { number: 42, head: { sha: "abc123" } },
        repository: { owner: { login: "zixuanjiang332" }, name: "releaseguard-ai" },
      }),
    );

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_TOKEN: "token",
        INPUT_REVIEW_COMMENTS: "smart",
      },
      runCheck,
      publishReviewComments,
    });

    expect(publishReviewComments).toHaveBeenCalledTimes(1);
    expect(publishReviewComments).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        pullNumber: 42,
        commitId: "abc123",
        token: "token",
      }),
      [
        expect.objectContaining({
          file: "src/auth.ts",
          line: 2,
        }),
      ],
    );
  });

  it("accepts the GitHub Actions hyphenated input env name for pr-comment", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [],
        metadata: baseMetadata,
      },
      report: {
        verdict: "fail",
        findings: [],
      },
      rendered: "# ReleaseGuard AI: FAIL\n",
      exitCode: 1,
    });
    const publishPrComment = vi.fn().mockResolvedValue(undefined);
    const eventPath = join(dir, "event.json");

    await writeFile(
      eventPath,
      JSON.stringify({
        pull_request: {
          number: 42,
        },
        repository: {
          owner: { login: "zixuanjiang332" },
          name: "releaseguard-ai",
        },
      }),
    );

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_TOKEN: "token",
        "INPUT_PR-COMMENT": "always",
      },
      runCheck,
      publishPrComment,
    });

    expect(publishPrComment).toHaveBeenCalledTimes(1);
  });

  it("only publishes comments for fail verdicts in on-failure mode", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context: {
        repoRoot: dir,
        baseRef: "origin/main",
        changedFiles: [],
        metadata: baseMetadata,
      },
      report: {
        verdict: "warn",
        findings: [],
      },
      rendered: "# ReleaseGuard AI: WARN\n",
      exitCode: 0,
    });
    const publishPrComment = vi.fn().mockResolvedValue(undefined);
    const eventPath = join(dir, "event.json");

    await writeFile(
      eventPath,
      JSON.stringify({
        pull_request: {
          number: 42,
        },
        repository: {
          owner: { login: "zixuanjiang332" },
          name: "releaseguard-ai",
        },
      }),
    );

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_TOKEN: "token",
        INPUT_PR_COMMENT: "on-failure",
      },
      runCheck,
      publishPrComment,
    });

    expect(publishPrComment).not.toHaveBeenCalled();
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

describe("release action runtime", () => {
  it("runs from a release directory without node_modules", async () => {
    const releaseDir = await mkdtemp(join(tmpdir(), "releaseguard-release-"));
    const workspaceDir = await mkdtemp(join(tmpdir(), "releaseguard-workspace-"));
    const releaseSummaryPath = join(releaseDir, "summary.md");
    const gitConfigPath = join(releaseDir, "gitconfig");
    const hooksPath = join(releaseDir, "hooks");
    const gitHooksPath = hooksPath.replace(/\\/g, "/");
    const gitEnv = {
      ...process.env,
      GIT_CONFIG_GLOBAL: gitConfigPath,
    };

    try {
      await cp("dist", join(releaseDir, "dist"), { recursive: true });
      await writeFile(join(releaseDir, "package.json"), JSON.stringify({ type: "module" }));
      await mkdir(hooksPath);
      await writeFile(join(hooksPath, "pre-commit"), "#!/bin/sh\nexit 42\n");
      await chmod(join(hooksPath, "pre-commit"), 0o755);
      await writeFile(gitConfigPath, `[commit]\n\tgpgsign = true\n[core]\n\thooksPath = ${gitHooksPath}\n`);

      await execFileAsync("git", ["init"], { cwd: workspaceDir, env: gitEnv });
      await writeFile(join(workspaceDir, "README.md"), "# Fixture\n");
      await execFileAsync("git", ["add", "README.md"], { cwd: workspaceDir, env: gitEnv });
      await execFileAsync(
        "git",
        [
          "-c",
          "user.name=Test",
          "-c",
          "user.email=test@example.com",
          "-c",
          "commit.gpgsign=false",
          "-c",
          "core.hooksPath=",
          "commit",
          "--no-gpg-sign",
          "--no-verify",
          "-m",
          "fixture",
        ],
        { cwd: workspaceDir, env: gitEnv },
      );

      const result = await execFileAsync("node", [join(releaseDir, "dist", "action.js")], {
        cwd: releaseDir,
        env: {
          ...process.env,
          GITHUB_WORKSPACE: workspaceDir,
          GITHUB_STEP_SUMMARY: releaseSummaryPath,
          INPUT_BASE: "HEAD",
          INPUT_AI: "false",
        },
      });

      expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
      await expect(readFile(releaseSummaryPath, "utf8")).resolves.toContain("# ReleaseGuard AI: PASS");
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
