import { describe, expect, it, vi } from "vitest";
import { collectGitContext, parseChangedFiles, parseNameStatus } from "../../src/git/git.js";

describe("parseNameStatus", () => {
  it("parses modified, added, deleted, and renamed files", () => {
    expect(parseNameStatus("M\tsrc/app.ts\nA\t.env\nD\told.ts\nR100\told-name.ts\tnew-name.ts\n")).toEqual([
      { path: "src/app.ts", status: "modified" },
      { path: ".env", status: "added" },
      { path: "old.ts", status: "deleted" },
      { path: "new-name.ts", status: "renamed" },
    ]);
  });
});

describe("parseChangedFiles", () => {
  it("attaches patches to changed file entries", () => {
    const files = parseChangedFiles(
      "M\tsrc/app.ts\n",
      "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n",
    );

    expect(files).toEqual([
      {
        path: "src/app.ts",
        status: "modified",
        patch: "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n",
      },
    ]);
  });
});

describe("collectGitContext", () => {
  it("collects repo root, base ref, changed files, and metadata", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce("/repo\n")
      .mockResolvedValueOnce("main\n")
      .mockResolvedValueOnce("M\tsrc/app.ts\n")
      .mockResolvedValueOnce("diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n")
      .mockResolvedValueOnce("package.json\npackage-lock.json\nDockerfile\n.github/workflows/ci.yml\n.env.example\n");

    const context = await collectGitContext({ cwd: "/repo", base: undefined, exec });

    expect(context.repoRoot).toBe("/repo");
    expect(context.baseRef).toBe("main");
    expect(context.changedFiles[0]?.path).toBe("src/app.ts");
    expect(context.metadata.hasPackageJson).toBe(true);
    expect(context.metadata.hasDockerfile).toBe(true);
    expect(context.metadata.hasGitHubActions).toBe(true);
    expect(context.metadata.hasEnvExample).toBe(true);
  });
});
