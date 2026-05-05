import { describe, expect, it } from "vitest";
import {
  isCiOrDeployPath,
  isDependencyManifest,
  isEnvExamplePath,
  isLockfile,
  isSourcePath,
  isTestPath,
  patchAddsEnvUsage,
  patchAddsFocusedOrSkippedTest,
  patchContainsSecret,
  touchesSecuritySensitiveArea,
} from "../../src/project/classify.js";

describe("path classifiers", () => {
  it("detects source and test paths", () => {
    expect(isSourcePath("src/server/auth.ts")).toBe(true);
    expect(isSourcePath("README.md")).toBe(false);
    expect(isTestPath("src/server/auth.test.ts")).toBe(true);
    expect(isTestPath("tests/auth.spec.ts")).toBe(true);
  });

  it("detects dependency and lock files", () => {
    expect(isDependencyManifest("package.json")).toBe(true);
    expect(isDependencyManifest("pyproject.toml")).toBe(true);
    expect(isLockfile("package-lock.json")).toBe(true);
    expect(isLockfile("poetry.lock")).toBe(true);
  });

  it("detects env examples and CI/deploy paths", () => {
    expect(isEnvExamplePath(".env.example")).toBe(true);
    expect(isCiOrDeployPath(".github/workflows/ci.yml")).toBe(true);
    expect(isCiOrDeployPath("Dockerfile")).toBe(true);
  });

  it("detects security-sensitive paths", () => {
    expect(touchesSecuritySensitiveArea("src/auth/session.ts", "")).toBe(true);
    expect(touchesSecuritySensitiveArea("src/routes/upload.ts", "")).toBe(true);
    expect(touchesSecuritySensitiveArea("src/components/Button.tsx", "")).toBe(false);
  });
});

describe("patch classifiers", () => {
  it("detects focused or skipped tests", () => {
    expect(patchAddsFocusedOrSkippedTest("+it.only('works', () => {})")).toBe(true);
    expect(patchAddsFocusedOrSkippedTest("+describe.skip('slow', () => {})")).toBe(true);
  });

  it("detects env usage", () => {
    expect(patchAddsEnvUsage("+const key = process.env.OPENAI_API_KEY;")).toBe(true);
    expect(patchAddsEnvUsage("+token = os.environ['TOKEN']")).toBe(true);
  });

  it("detects likely secrets", () => {
    expect(patchContainsSecret("+OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef")).toBe(true);
    expect(patchContainsSecret("+const label = 'safe';")).toBe(false);
  });
});
