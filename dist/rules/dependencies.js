import { isDependencyManifest } from "../project/classify.js";
export const dependencyRiskRule = {
    id: "dependencies.risk",
    check: "dependencies",
    run(context) {
        const findings = [];
        const manifests = context.changedFiles.filter((file) => isDependencyManifest(file.path));
        const changedPaths = new Set(context.changedFiles.map((file) => normalizePath(file.path)));
        const manifestsWithoutLockfiles = manifests.filter((file) => !hasMatchingLockfile(file.path, changedPaths));
        if (manifestsWithoutLockfiles.length > 0) {
            findings.push({
                id: "dependencies.lockfile-not-updated",
                severity: "warn",
                title: "Dependency manifest changed without lockfile",
                message: "A dependency manifest changed, but no recognized lockfile changed in the same diff.",
                files: manifestsWithoutLockfiles.map((file) => file.path),
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
function hasMatchingLockfile(manifestPath, changedPaths) {
    const normalized = normalizePath(manifestPath);
    const directory = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/") + 1) : "";
    const filename = normalized.slice(directory.length);
    return matchingLockfileNames(filename).some((lockfile) => changedPaths.has(`${directory}${lockfile}`));
}
function matchingLockfileNames(manifestName) {
    switch (manifestName) {
        case "package.json":
            return ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
        case "pyproject.toml":
            return ["poetry.lock", "uv.lock"];
        case "go.mod":
            return ["go.sum"];
        case "Cargo.toml":
            return ["Cargo.lock"];
        default:
            return [];
    }
}
function normalizePath(path) {
    return path.replaceAll("\\", "/");
}
//# sourceMappingURL=dependencies.js.map