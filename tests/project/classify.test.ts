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
    for (const path of [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "go.mod",
      "Cargo.toml",
      "pom.xml",
      "packages/api/package.json",
      "services/web/pyproject.toml",
      "backend/pom.xml",
    ]) {
      expect(isDependencyManifest(path)).toBe(true);
    }

    for (const path of [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "poetry.lock",
      "uv.lock",
      "go.sum",
      "Cargo.lock",
      "packages/api/package-lock.json",
      "services/web/pnpm-lock.yaml",
      "backend/poetry.lock",
    ]) {
      expect(isLockfile(path)).toBe(true);
    }
  });

  it("detects env examples and CI/deploy paths", () => {
    for (const path of [".env.example", ".env.sample", "env.example", "config/.env.example", "config/.env.sample"]) {
      expect(isEnvExamplePath(path)).toBe(true);
    }

    for (const path of [
      ".github/workflows/ci.yml",
      "Dockerfile",
      "services/api/Dockerfile",
      "docker-compose.yml",
      "docker-compose.yaml",
      "deploy/app.yaml",
      "deployment/app.yaml",
      "infra/deploy/app.yaml",
    ]) {
      expect(isCiOrDeployPath(path)).toBe(true);
    }
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
    expect(patchAddsFocusedOrSkippedTest("-it.only('old', () => {})")).toBe(false);
    expect(patchAddsFocusedOrSkippedTest("+++ b/tests/auth.test.ts")).toBe(false);
  });

  it("detects env usage", () => {
    expect(patchAddsEnvUsage("+const key = process.env.OPENAI_API_KEY;")).toBe(true);
    expect(patchAddsEnvUsage("+token = os.environ['TOKEN']")).toBe(true);
    expect(patchAddsEnvUsage("+const url = import.meta.env.VITE_API_URL;")).toBe(true);
    expect(patchAddsEnvUsage("+const mode = import.meta.env.MODE;")).toBe(true);
    expect(patchAddsEnvUsage("-const key = process.env.OPENAI_API_KEY;")).toBe(false);
    expect(patchAddsEnvUsage("+++ b/.env")).toBe(false);
  });

  it("detects likely secrets", () => {
    expect(patchContainsSecret("+OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef")).toBe(true);
    expect(patchContainsSecret("+const label = 'safe';")).toBe(false);
    expect(patchContainsSecret("-OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef")).toBe(false);
    expect(patchContainsSecret("+++ b/.env")).toBe(false);
  });
});
