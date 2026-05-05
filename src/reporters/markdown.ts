import type { Finding, GateReport } from "../domain/types.js";

export function renderMarkdown(report: GateReport): string {
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

function formatFinding(finding: Finding): string {
  return [
    `### ${finding.severity.toUpperCase()}: ${sanitizeMarkdownText(finding.title)}`,
    "",
    `- Rule: ${formatInlineCode(finding.id)}`,
    `- Files: ${finding.files.map((file) => formatInlineCode(file)).join(", ")}`,
    `- Reason: ${sanitizeMarkdownText(finding.message)}`,
    `- Suggestion: ${sanitizeMarkdownText(finding.suggestion)}`,
  ].join("\n");
}

function formatInlineCode(value: string): string {
  const sanitized = sanitizeMarkdownText(value);
  if (sanitized.includes("\\`")) return sanitized;
  return `\`${sanitized}\``;
}

function sanitizeMarkdownText(value: string): string {
  return value
    .replaceAll(/[\r\n]+/g, " ")
    .replaceAll("`", "\\`")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeMarkdownBlockText(value: string): string {
  return sanitizeMarkdownText(value).replace(
    /^(\s*)((?:#{1,6}|[-*+>])(?=\s)|\d+\.(?=\s)|-{3,}(?=\s|$))/,
    "$1\\$2",
  );
}
