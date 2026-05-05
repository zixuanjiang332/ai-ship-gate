import { isCiOrDeployPath } from "../project/classify.js";
export const ciRiskRule = {
    id: "ci.risk",
    check: "ci",
    run(context) {
        const findings = [];
        const deployFiles = context.changedFiles.filter((file) => isCiOrDeployPath(file.path) && !isDockerPath(file.path));
        if (deployFiles.length > 0) {
            findings.push({
                id: "deploy.config-changed",
                severity: "warn",
                title: "CI or deployment configuration changed",
                message: "The diff changes CI, compose, or deployment files.",
                files: deployFiles.map((file) => file.path),
                suggestion: "Verify the changed deployment path in CI or include validation notes in the PR.",
            });
        }
        return findings;
    },
};
export const dockerRiskRule = {
    id: "docker.risk",
    check: "docker",
    run(context) {
        const findings = [];
        const dockerfiles = context.changedFiles.filter((file) => isDockerPath(file.path));
        for (const file of dockerfiles) {
            const patch = file.patch.toUpperCase();
            if (!patch.includes("HEALTHCHECK")) {
                findings.push({
                    id: "deploy.dockerfile-healthcheck-missing",
                    severity: "warn",
                    title: "Dockerfile healthcheck not present",
                    message: "A Dockerfile changed without adding or retaining an obvious HEALTHCHECK instruction in the patch.",
                    files: [file.path],
                    suggestion: "Confirm the image has an external healthcheck or add a Docker HEALTHCHECK.",
                });
            }
        }
        return findings;
    },
};
function isDockerPath(path) {
    return path === "Dockerfile" || path.endsWith("/Dockerfile");
}
//# sourceMappingURL=ciDeploy.js.map