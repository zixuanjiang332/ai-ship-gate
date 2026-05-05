import type { Finding } from "../domain/types.js";
import { isDependencyManifest, isLockfile } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const dependencyRiskRule: Rule = {
  id: "dependencies.risk",
  check: "dependencies",
  run(context) {
    const findings: Finding[] = [];
    const manifests = context.changedFiles.filter((file) => isDependencyManifest(file.path));
    const lockfiles = context.changedFiles.filter((file) => isLockfile(file.path));

    if (manifests.length > 0 && lockfiles.length === 0) {
      findings.push({
        id: "dependencies.lockfile-not-updated",
        severity: "warn",
        title: "Dependency manifest changed without lockfile",
        message: "A dependency manifest changed, but no recognized lockfile changed in the same diff.",
        files: manifests.map((file) => file.path),
        suggestion: "Update and commit the matching lockfile so CI and installs stay reproducible.",
      });
    }

    for (const file of manifests) {
      const added = file.patch.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"));
      if (added.some((line) => /"postinstall"\s*:|\b(?:curl|wget)(?:\s+-{1,2}[A-Za-z0-9][A-Za-z0-9-]*)*\s+https?:\/\//.test(line))) {
        findings.push({
          id: "dependencies.risky-install-script",
          severity: "fail",
          title: "Risky install-time behavior introduced",
          message: "The dependency manifest appears to introduce install-time scripts or remote downloads.",
          files: [file.path],
          suggestion: "Remove the install-time behavior or document and review why it is required.",
        });
      }
    }

    return findings;
  },
};
