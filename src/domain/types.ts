export type Severity = "info" | "warn" | "fail";
export type Verdict = "pass" | "warn" | "fail";
export type FailOn = "warn" | "fail";
export type OutputFormat = "terminal" | "json" | "markdown";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  files: string[];
  suggestion: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  patch: string;
}

export interface ProjectMetadata {
  hasPackageJson: boolean;
  hasPackageLock: boolean;
  hasPnpmLock: boolean;
  hasYarnLock: boolean;
  hasPyproject: boolean;
  hasRequirements: boolean;
  hasGoMod: boolean;
  hasCargoToml: boolean;
  hasPomXml: boolean;
  hasDockerfile: boolean;
  hasCompose: boolean;
  hasGitHubActions: boolean;
  hasEnvExample: boolean;
}

export interface GateContext {
  repoRoot: string;
  baseRef: string;
  changedFiles: ChangedFile[];
  metadata: ProjectMetadata;
}

export interface ShipGateConfig {
  failOn: FailOn;
  ai: {
    enabled: boolean;
  };
  checks: {
    tests: boolean;
    dependencies: boolean;
    ci: boolean;
    docker: boolean;
    env: boolean;
    security: boolean;
  };
}

export interface GateReport {
  verdict: Verdict;
  findings: Finding[];
  aiSummary?: string;
}

export interface CheckOptions {
  cwd: string;
  base?: string;
  format: OutputFormat;
  ai: boolean;
}
