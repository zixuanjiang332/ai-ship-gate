import { describe, expect, it } from "vitest";
import type { ChangedFile, Finding } from "../../src/domain/types.js";
import { resolveReviewAnchor } from "../../src/action/diffAnchors.js";

describe("resolveReviewAnchor", () => {
  it("anchors secret findings to the matching added line", () => {
    const finding: Finding = {
      id: "security.secret-in-diff",
      severity: "fail",
      title: "Secret-like value in diff",
      message: "The diff contains a token, key, password, or secret-like value.",
      files: ["src/config.ts"],
      suggestion: "Remove it.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/config.ts",
        status: "modified",
        patch: [
          "@@ -1,2 +1,3 @@",
          " export const ok = true;",
          "+export const token = \"ghp_123456789012345678901234567890\";",
          " export const done = true;",
          "",
        ].join("\n"),
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "src/config.ts", line: 2 });
  });

  it("anchors dependency findings to the added manifest line", () => {
    const finding: Finding = {
      id: "dependencies.lockfile-not-updated",
      severity: "warn",
      title: "Dependency manifest changed without lockfile",
      message: "A dependency manifest changed, but no recognized lockfile changed in the same diff.",
      files: ["package.json"],
      suggestion: "Update the lockfile.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "package.json",
        status: "modified",
        patch: ['@@ -4,5 +4,6 @@', '   "dependencies": {', '+    "zod": "^3.24.0",', '     "yaml": "^2.8.0"', "   }", ""].join(
          "\n",
        ),
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "package.json", line: 5 });
  });

  it("anchors env example findings to the added env usage line", () => {
    const finding: Finding = {
      id: "env.example-not-updated",
      severity: "warn",
      title: "New environment variable usage lacks an example",
      message: "The diff adds environment variable usage without updating an env example or documentation.",
      files: ["src/env.ts"],
      suggestion: "Update .env.example.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/env.ts",
        status: "modified",
        patch: [
          "@@ -10,2 +10,3 @@",
          " export function readEnv() {",
          '+  return process.env["API_TOKEN"] ?? "";',
          " }",
          "",
        ].join("\n"),
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "src/env.ts", line: 11 });
  });

  it("anchors missing-tests findings to the first added source line", () => {
    const finding: Finding = {
      id: "tests.missing-related-tests",
      severity: "warn",
      title: "Source changed without tests",
      message: "Source-like files changed, but this diff does not include test-like files.",
      files: ["src/auth.ts"],
      suggestion: "Add tests.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/auth.ts",
        status: "modified",
        patch: ["@@ -10,2 +10,3 @@", " export function login() {", "+  return true;", " }", ""].join("\n"),
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "src/auth.ts", line: 11 });
  });

  it("returns undefined when it cannot find an exact added line", () => {
    const finding: Finding = {
      id: "env.example-not-updated",
      severity: "warn",
      title: "New environment variable usage lacks an example",
      message: "The diff adds environment variable usage without updating an env example or documentation.",
      files: ["src/env.ts"],
      suggestion: "Update .env.example.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/env.ts",
        status: "modified",
        patch: ["@@ -10,2 +10,2 @@", '-const value = process.env["API_TOKEN"] ?? "";', '+const value = existing;', ""].join(
          "\n",
        ),
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toBeUndefined();
  });
});
