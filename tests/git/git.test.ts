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

  it("extracts patches for multiple files by exact diff headers", () => {
    const files = parseChangedFiles(
      "M\tsrc/app.ts\nM\tsrc/other.ts\n",
      [
        "diff --git a/src/app.ts b/src/app.ts",
        "+++ b/src/app.ts",
        "+const app = true;",
        "diff --git a/src/other.ts b/src/other.ts",
        "+++ b/src/other.ts",
        "+const other = true;",
        "",
      ].join("\n"),
    );

    expect(files).toEqual([
      {
        path: "src/app.ts",
        status: "modified",
        patch: "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const app = true;\n",
      },
      {
        path: "src/other.ts",
        status: "modified",
        patch: "diff --git a/src/other.ts b/src/other.ts\n+++ b/src/other.ts\n+const other = true;\n",
      },
    ]);
  });

  it("does not match prefix-like paths", () => {
    const files = parseChangedFiles(
      "M\tsrc/app.ts\nM\tsrc/app.tsx\n",
      [
        "diff --git a/src/app.tsx b/src/app.tsx",
        "+++ b/src/app.tsx",
        "+const app = true;",
        "",
      ].join("\n"),
    );

    expect(files).toEqual([
      { path: "src/app.ts", status: "modified", patch: "" },
      {
        path: "src/app.tsx",
        status: "modified",
        patch: "diff --git a/src/app.tsx b/src/app.tsx\n+++ b/src/app.tsx\n+const app = true;\n",
      },
    ]);
  });

  it("matches nested paths and paths with spaces", () => {
    const files = parseChangedFiles(
      "M\tsrc/nested/app file.ts\n",
      [
        "diff --git a/src/nested/app file.ts b/src/nested/app file.ts",
        "+++ b/src/nested/app file.ts",
        "+const nested = true;",
        "",
      ].join("\n"),
    );

    expect(files[0]?.patch).toBe(
      "diff --git a/src/nested/app file.ts b/src/nested/app file.ts\n+++ b/src/nested/app file.ts\n+const nested = true;\n",
    );
  });

  it("matches renamed files by the new path", () => {
    const files = parseChangedFiles(
      "R100\told-name.ts\tnew-name.ts\n",
      [
        "diff --git a/old-name.ts b/new-name.ts",
        "rename from old-name.ts",
        "rename to new-name.ts",
        "",
      ].join("\n"),
    );

    expect(files).toEqual([
      {
        path: "new-name.ts",
        status: "renamed",
        patch: "diff --git a/old-name.ts b/new-name.ts\nrename from old-name.ts\nrename to new-name.ts\n",
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
    expect(exec).toHaveBeenNthCalledWith(1, ["rev-parse", "--show-toplevel"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(2, ["merge-base", "HEAD", "main"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(3, ["diff", "--name-status", "main", "--"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(4, ["diff", "--unified=0", "main", "--"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(5, ["ls-files"], "/repo");
  });

  it("falls back to origin/main when local base candidates fail", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce("/repo\n")
      .mockRejectedValueOnce(new Error("no local main"))
      .mockRejectedValueOnce(new Error("no local master"))
      .mockResolvedValueOnce("origin-main-sha\n")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("package.json\n");

    const context = await collectGitContext({ cwd: "/repo", exec });

    expect(context.baseRef).toBe("origin-main-sha");
    expect(exec).toHaveBeenNthCalledWith(2, ["merge-base", "HEAD", "main"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(3, ["merge-base", "HEAD", "master"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(4, ["merge-base", "HEAD", "origin/main"], "/repo");
    expect(exec).toHaveBeenNthCalledWith(5, ["diff", "--name-status", "origin-main-sha", "--"], "/repo");
  });

  it("throws a clear error when no base candidate resolves", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce("/repo\n")
      .mockRejectedValueOnce(new Error("no local main"))
      .mockRejectedValueOnce(new Error("no local master"))
      .mockRejectedValueOnce(new Error("no origin main"))
      .mockRejectedValueOnce(new Error("no origin master"));

    await expect(collectGitContext({ cwd: "/repo", exec })).rejects.toThrow(
      "Unable to resolve a base ref. Pass --base <ref>.",
    );
    expect(exec).toHaveBeenNthCalledWith(5, ["merge-base", "HEAD", "origin/master"], "/repo");
  });
});
