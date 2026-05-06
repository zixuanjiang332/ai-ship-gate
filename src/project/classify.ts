const sourcePrefixes = ["src/", "app/", "lib/", "server/", "packages/"];
const testPattern = /(^|\/)(__tests__|tests?)\/|(\.|-)(test|spec)\.[cm]?[jt]sx?$/i;
const dependencyManifests = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
]);
const dependencyManifestNames = [...dependencyManifests];
const lockfiles = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "poetry.lock",
  "uv.lock",
  "go.sum",
  "Cargo.lock",
]);
const lockfileNames = [...lockfiles];
const envExamples = new Set([".env.example", ".env.sample", "env.example"]);
const securityTerms = [
  "auth",
  "permission",
  "permissions",
  "role",
  "roles",
  "payment",
  "stripe",
  "crypto",
  "cors",
  "sql",
  "query",
  "upload",
  "token",
  "session",
];

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isSourcePath(path: string): boolean {
  const normalized = normalize(path);
  return sourcePrefixes.some((prefix) => normalized.startsWith(prefix)) && !isTestPath(normalized);
}

export function isTestPath(path: string): boolean {
  return testPattern.test(normalize(path));
}

export function isDependencyManifest(path: string): boolean {
  const normalized = normalize(path);
  return dependencyManifests.has(normalized) || dependencyManifestNames.some((manifest) => normalized.endsWith(`/${manifest}`));
}

export function isLockfile(path: string): boolean {
  const normalized = normalize(path);
  return lockfiles.has(normalized) || lockfileNames.some((lockfile) => normalized.endsWith(`/${lockfile}`));
}

export function isEnvExamplePath(path: string): boolean {
  const normalized = normalize(path);
  return envExamples.has(normalized) || normalized.endsWith("/.env.example") || normalized.endsWith("/.env.sample");
}

export function isCiOrDeployPath(path: string): boolean {
  const normalized = normalize(path);
  return (
    normalized.startsWith(".github/workflows/") ||
    normalized === "Dockerfile" ||
    normalized.endsWith("/Dockerfile") ||
    normalized === "docker-compose.yml" ||
    normalized === "docker-compose.yaml" ||
    normalized.startsWith("deploy/") ||
    normalized.startsWith("deployment/") ||
    normalized.includes("/deploy/") ||
    normalized.includes("/deployment/")
  );
}

export function patchAddsFocusedOrSkippedTest(patch: string): boolean {
  return addedLines(patch).some((line) => /\.(only|skip)\s*\(|\b(xit|fit)\s*\(/.test(line));
}

export function patchAddsEnvUsage(patch: string): boolean {
  return addedLines(patch).some((line) =>
    /(process\.env\.[A-Z0-9_]+|process\.env\[['"][A-Z0-9_]+['"]\]|import\.meta\.env\.[A-Z0-9_]+|os\.environ\[['"][A-Z0-9_]+['"]\]|getenv\(['"][A-Z0-9_]+['"]\))/.test(
      line,
    ),
  );
}

export function patchContainsSecret(patch: string): boolean {
  return addedLines(patch).some((line) =>
    /\b[A-Z0-9_-]*(?:api[_-]?key|secret|token|password|access[_-]?key)[A-Z0-9_-]*\s*[:=]\s*['"]?[A-Za-z0-9_./+=-]{16,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}/i.test(
      line,
    ),
  );
}

export function touchesSecuritySensitiveArea(path: string, patch: string): boolean {
  if (isWorkflowPath(path)) {
    return workflowPatchHasElevatedSecurityRisk(patch);
  }

  const haystack = `${normalize(path)}\n${patch}`.toLowerCase();
  return securityTerms.some((term) => haystack.includes(term));
}

function isWorkflowPath(path: string): boolean {
  return normalize(path).startsWith(".github/workflows/");
}

function workflowPatchHasElevatedSecurityRisk(patch: string): boolean {
  const added = addedLines(patch).join("\n").toLowerCase();

  return (
    /\bpull_request_target\b/.test(added) ||
    /\bworkflow_run\b/.test(added) ||
    /\brepository_dispatch\b/.test(added) ||
    /\bid-token\s*:\s*write\b/.test(added) ||
    /\bactions\s*:\s*write\b/.test(added) ||
    /\bsecurity-events\s*:\s*write\b/.test(added) ||
    /\bpackages\s*:\s*write\b/.test(added) ||
    /\bsecrets\s*:\s*inherit\b/.test(added) ||
    /\bpersist-credentials\s*:\s*true\b/.test(added)
  );
}

function addedLines(patch: string): string[] {
  return patch
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
}
