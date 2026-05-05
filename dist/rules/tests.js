import { isSourcePath, isTestPath } from "../project/classify.js";
export const testRiskRule = {
    id: "tests.risk",
    check: "tests",
    run(context) {
        const findings = [];
        const sourceChanges = context.changedFiles.filter((file) => isSourcePath(file.path));
        const testChanges = context.changedFiles.filter((file) => isTestPath(file.path));
        if (sourceChanges.length > 0 && testChanges.length === 0) {
            findings.push({
                id: "tests.missing-related-tests",
                severity: "warn",
                title: "Source changed without tests",
                message: "Source-like files changed, but this diff does not include test-like files.",
                files: sourceChanges.map((file) => file.path),
                suggestion: "Add or update tests that cover the changed behavior before shipping.",
            });
        }
        for (const file of context.changedFiles) {
            const added = file.patch.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"));
            if (added.some((line) => /\.(only)\s*\(|\bfit\s*\(/.test(line))) {
                findings.push({
                    id: "tests.focused-test",
                    severity: "fail",
                    title: "Focused test introduced",
                    message: "The diff introduces a focused test, which can hide the rest of the suite.",
                    files: [file.path],
                    suggestion: "Remove `.only` or `fit` before merging.",
                });
            }
            if (added.some((line) => /\.(skip)\s*\(|\bxit\s*\(/.test(line))) {
                findings.push({
                    id: "tests.skipped-test",
                    severity: "warn",
                    title: "Skipped test introduced",
                    message: "The diff introduces a skipped test.",
                    files: [file.path],
                    suggestion: "Confirm the skipped test is intentional and tracked before shipping.",
                });
            }
        }
        return findings;
    },
};
//# sourceMappingURL=tests.js.map