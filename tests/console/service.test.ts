import { describe, expect, it, vi } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runConsoleCheck } from "../../src/console/service.js";

const context: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [{ path: "src/auth.ts", status: "modified", patch: "+export const login = true;" }],
  metadata: {
    hasPackageJson: true,
    hasPackageLock: true,
    hasPnpmLock: true,
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
  },
};

describe("runConsoleCheck", () => {
  it("returns a UI-friendly structured result without writing terminal output", async () => {
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const runCheck = vi.fn().mockResolvedValue({
      context,
      report: {
        verdict: "warn",
        findings: [
          {
            id: "tests.missing-related-tests",
            severity: "warn",
            title: "Source changed without tests",
            message: "Source-like files changed, but this diff does not include test-like files.",
            files: ["src/auth.ts"],
            suggestion: "Add tests.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: WARN\n",
      exitCode: 0,
    });

    const result = await runConsoleCheck(
      {
        repoPath: "/repo",
        base: "main",
        failOn: "fail",
        checks: {
          tests: true,
          dependencies: true,
          env: true,
          ci: true,
          docker: true,
          security: true,
        },
      },
      runCheck,
    );

    expect(result).toEqual({
      source: "local",
      repoPath: "/repo",
      baseRef: "main",
      verdict: "warn",
      findings: [
        {
          id: "tests.missing-related-tests",
          severity: "warn",
          title: "Source changed without tests",
          message: "Source-like files changed, but this diff does not include test-like files.",
          files: ["src/auth.ts"],
          suggestion: "Add tests.",
        },
      ],
      files: [
        {
          path: "src/auth.ts",
          status: "modified",
          snippet: "+export const login = true;",
          matchedFindingIds: ["tests.missing-related-tests"],
        },
      ],
      findingsCount: 1,
      affectedFilesCount: 1,
      counts: {
        fail: 0,
        warn: 1,
        info: 0,
      },
      effectiveConfig: {
        failOn: "fail",
        checks: {
          tests: true,
          dependencies: true,
          env: true,
          ci: true,
          docker: true,
          security: true,
        },
      },
    });
    expect(runCheck).toHaveBeenCalledWith({
      cwd: "/repo",
      base: "main",
      format: "json",
      ai: false,
      configOverride: {
        failOn: "fail",
        checks: {
          tests: true,
          dependencies: true,
          env: true,
          ci: true,
          docker: true,
          security: true,
        },
      },
      write: expect.any(Function),
    });
    const [call] = runCheck.mock.calls as [[{ write: (output: string) => void }]];
    call[0].write("# ReleaseGuard AI: WARN\n");
    expect(stdoutWrite).not.toHaveBeenCalled();
    stdoutWrite.mockRestore();
  });
});
