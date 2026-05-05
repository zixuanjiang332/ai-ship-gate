export function renderMarkdown(report) {
    const lines = [`# AI Ship Gate: ${report.verdict.toUpperCase()}`, ""];
    if (report.aiSummary) {
        lines.push("## AI Summary", "", sanitizeMarkdownBlockText(report.aiSummary), "");
    }
    if (report.findings.length === 0) {
        lines.push("No release risks detected.", "");
        return lines.join("\n");
    }
    lines.push("## Findings", "");
    for (const finding of report.findings) {
        lines.push(formatFinding(finding), "");
    }
    return lines.join("\n");
}
function formatFinding(finding) {
    return [
        `### ${finding.severity.toUpperCase()}: ${sanitizeMarkdownText(finding.title)}`,
        "",
        `- Rule: ${formatInlineCode(finding.id)}`,
        `- Files: ${finding.files.map((file) => formatInlineCode(file)).join(", ")}`,
        `- Reason: ${sanitizeMarkdownText(finding.message)}`,
        `- Suggestion: ${sanitizeMarkdownText(finding.suggestion)}`,
    ].join("\n");
}
function formatInlineCode(value) {
    const sanitized = sanitizeMarkdownText(value);
    if (sanitized.includes("\\`"))
        return sanitized;
    return `\`${sanitized}\``;
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
//# sourceMappingURL=markdown.js.map