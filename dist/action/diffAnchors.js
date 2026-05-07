import { isDependencyManifest, patchAddsEnvUsage, patchContainsSecret } from "../project/classify.js";
const supportedReviewAnchorIds = new Set([
    "security.secret-in-diff",
    "dependencies.lockfile-not-updated",
    "env.example-not-updated",
    "tests.missing-related-tests",
]);
export function resolveReviewAnchor(finding, changedFiles) {
    if (!supportedReviewAnchorIds.has(finding.id)) {
        return undefined;
    }
    for (const changedFile of changedFiles) {
        if (!hasFindingFile(finding, changedFile.path) || !changedFile.patch) {
            continue;
        }
        const anchor = resolveAnchorInFile(finding, changedFile);
        if (anchor) {
            return anchor;
        }
    }
    return undefined;
}
function resolveAnchorInFile(finding, changedFile) {
    if (finding.id === "tests.missing-related-tests") {
        return toAnchor(changedFile.path, firstAddedLine(changedFile.patch));
    }
    if (finding.id === "dependencies.lockfile-not-updated" && isDependencyManifest(changedFile.path)) {
        return toAnchor(changedFile.path, firstAddedLine(changedFile.patch));
    }
    if (finding.id === "env.example-not-updated") {
        return toAnchor(changedFile.path, firstMatchingAddedLine(changedFile.patch, (line) => patchAddsEnvUsage(`${line}\n`)));
    }
    if (finding.id === "security.secret-in-diff") {
        return toAnchor(changedFile.path, firstMatchingAddedLine(changedFile.patch, (line) => patchContainsSecret(`${line}\n`)));
    }
    return undefined;
}
function firstAddedLine(patch) {
    return addedLinesWithNumbers(patch)[0];
}
function firstMatchingAddedLine(patch, predicate) {
    return addedLinesWithNumbers(patch).find((line) => predicate(line.content));
}
function addedLinesWithNumbers(patch) {
    const addedLines = [];
    let newLineNumber = 0;
    for (const patchLine of patch.split(/\r?\n/)) {
        const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(patchLine);
        if (hunkMatch) {
            newLineNumber = Number(hunkMatch[1]);
            continue;
        }
        if (patchLine.startsWith("+") && !patchLine.startsWith("+++")) {
            addedLines.push({ content: patchLine, line: newLineNumber });
            newLineNumber += 1;
            continue;
        }
        if (!patchLine.startsWith("-")) {
            newLineNumber += 1;
        }
    }
    return addedLines;
}
function hasFindingFile(finding, path) {
    const normalizedPath = normalizePath(path);
    return finding.files.some((file) => normalizePath(file) === normalizedPath);
}
function normalizePath(path) {
    return path.replaceAll("\\", "/");
}
function toAnchor(file, addedLine) {
    if (!addedLine) {
        return undefined;
    }
    return { file, line: addedLine.line };
}
//# sourceMappingURL=diffAnchors.js.map