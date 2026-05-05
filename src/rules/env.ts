import type { Finding } from "../domain/types.js";
import { isEnvExamplePath, patchAddsEnvUsage, patchContainsSecret } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const envRiskRule: Rule = {
  id: "env.risk",
  check: "env",
  run(context) {
    const findings: Finding[] = [];
    const envUsageFiles = context.changedFiles.filter((file) => patchAddsEnvUsage(file.patch));
    const envExampleChanged = context.changedFiles.some((file) => isEnvExamplePath(file.path) || isEnvDocumentationPath(file.path));

    if (envUsageFiles.length > 0 && !envExampleChanged) {
      findings.push({
        id: "env.example-not-updated",
        severity: "warn",
        title: "New environment variable usage lacks an example",
        message: "The diff adds environment variable usage without updating an env example or documentation.",
        files: envUsageFiles.map((file) => file.path),
        suggestion: "Add the required variable to `.env.example` or document it in setup instructions.",
      });
    }

    const secretFiles = context.changedFiles.filter((file) => isRealEnvFilePath(file.path));
    if (secretFiles.length > 0) {
      findings.push({
        id: "env.secret-file-committed",
        severity: "fail",
        title: "Secret-like env file committed",
        message: "A real env file appears in the diff.",
        files: secretFiles.map((file) => file.path),
        suggestion: "Remove the env file from git and commit a safe example file instead.",
      });
    }

    const secretValueFiles = context.changedFiles.filter((file) => patchContainsSecret(file.patch));
    if (secretValueFiles.length > 0) {
      findings.push({
        id: "env.secret-like-value",
        severity: "fail",
        title: "Secret-like value in diff",
        message: "The diff includes a token, key, password, or secret-like value.",
        files: secretValueFiles.map((file) => file.path),
        suggestion: "Rotate the secret if it is real, then replace it with a safe example value.",
      });
    }

    return findings;
  },
};

function isRealEnvFilePath(path: string): boolean {
  if (isEnvExamplePath(path)) {
    return false;
  }

  const filename = path.replaceAll("\\", "/").split("/").pop() ?? "";
  return filename === ".env" || filename.startsWith(".env.");
}

function isEnvDocumentationPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return /README/i.test(normalized) || /(^|\/)docs\//i.test(normalized);
}
