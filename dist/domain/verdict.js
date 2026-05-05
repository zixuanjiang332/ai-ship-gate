const rank = {
    pass: 0,
    warn: 1,
    fail: 2,
};
export function aggregateVerdict(findings) {
    if (findings.some((finding) => finding.severity === "fail")) {
        return "fail";
    }
    if (findings.some((finding) => finding.severity === "warn")) {
        return "warn";
    }
    return "pass";
}
export function shouldExitWithFailure(verdict, failOn) {
    return rank[verdict] >= rank[failOn];
}
//# sourceMappingURL=verdict.js.map