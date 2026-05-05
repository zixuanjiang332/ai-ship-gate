import type { Finding } from "../domain/types.js";
import { patchContainsSecret, touchesSecuritySensitiveArea } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const securityRiskRule: Rule = {
  id: "security.risk",
  check: "security",
  run(context) {
    const findings: Finding[] = [];
    const sensitiveFiles = context.changedFiles.filter((file) => touchesSecuritySensitiveArea(file.path, file.patch));
    const secretFiles = context.changedFiles.filter((file) => patchContainsSecret(file.patch));

    if (sensitiveFiles.length > 0) {
      findings.push({
        id: "security.sensitive-area-changed",
        severity: "warn",
        title: "Security-sensitive area changed",
        message:
          "The diff touches authentication, authorization, payments, cryptography, CORS, SQL/query handling, uploads, tokens, or sessions.",
        files: sensitiveFiles.map((file) => file.path),
        suggestion: "Review this change with extra care and make sure tests cover the security-sensitive behavior.",
      });
    }

    if (secretFiles.length > 0) {
      findings.push({
        id: "security.secret-in-diff",
        severity: "fail",
        title: "Secret-like value in diff",
        message: "The diff contains a token, key, password, or secret-like value.",
        files: secretFiles.map((file) => file.path),
        suggestion: "Remove the value from git history if needed, rotate it, and use a safe example value.",
      });
    }

    return findings;
  },
};
