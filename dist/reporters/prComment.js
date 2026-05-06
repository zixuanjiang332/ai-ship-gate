import { summarizeFindings } from "./actionSummary.js";
const productName = "ReleaseGuard AI";
const maxCommentFindings = 10;
export const releaseGuardCommentMarker = "<!-- releaseguard-ai-comment -->";
export function renderPrComment(report) {
    const counts = summarizeFindings(report);
    const verdict = report.verdict.toUpperCase();
    const lines = [
        releaseGuardCommentMarker,
        `## ${productName}: ${verdict}`,
        "",
        "| Verdict | Findings | Fail | Warn | Info |",
        "| --- | ---: | ---: | ---: | ---: |",
        `| ${verdict} | ${counts.findingsCount} | ${counts.failCount} | ${counts.warnCount} | ${counts.infoCount} |`,
        "",
    ];
    if (report.findings.length === 0) {
        lines.push("No release risks detected.", "");
    }
    else {
        lines.push("## Top Findings", "", "| Severity | Rule | Files | Suggestion |", "| --- | --- | --- | --- |");
        for (const finding of report.findings.slice(0, maxCommentFindings)) {
            lines.push(formatFindingRow(finding));
        }
        if (report.findings.length > maxCommentFindings) {
            lines.push("", `Showing first ${maxCommentFindings} of ${report.findings.length} findings.`);
        }
        lines.push("");
    }
    if (report.aiSummary) {
        lines.push("## AI Summary", "", sanitizeMarkdownBlockText(report.aiSummary), "");
    }
    return lines.join("\n");
}
function formatFindingRow(finding) {
    return [
        finding.severity.toUpperCase(),
        formatInlineCode(finding.id),
        formatFiles(finding.files),
        sanitizeTableText(finding.suggestion),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |");
}
function formatFiles(files) {
    if (files.length === 0)
        return "-";
    return files.map((file) => formatInlineCode(file)).join(", ");
}
function formatInlineCode(value) {
    const sanitized = sanitizeTableText(value);
    if (sanitized.includes("\\`"))
        return sanitized;
    return `\`${sanitized}\``;
}
function sanitizeTableText(value) {
    return sanitizeMarkdownText(value).replaceAll("|", "\\|");
}
function sanitizeMarkdownText(value) {
    return value
        .replaceAll(/[\r\n]+/g, " ")
        .replaceAll("`", "\\`")
        .replaceAll("!", "\\!")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
function sanitizeMarkdownBlockText(value) {
    return sanitizeMarkdownText(value).replace(/^(\s*)((?:#{1,6}|[-*+>])(?=\s)|\d+\.(?=\s)|-{3,}(?=\s|$))/, "$1\\$2");
}
//# sourceMappingURL=prComment.js.map