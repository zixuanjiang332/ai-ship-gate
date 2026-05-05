import type { Finding, GateReport } from "../domain/types.js";

export function renderMarkdown(report: GateReport): string {
  const lines = [`# AI Ship Gate: ${report.verdict.toUpperCase()}`, ""];

  if (report.aiSummary) {
    lines.push("## AI Summary", "", report.aiSummary, "");
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
    `### ${finding.severity.toUpperCase()}: ${finding.title}`,
    "",
    `- Rule: \`${finding.id}\``,
    `- Files: ${finding.files.map((file) => `\`${file}\``).join(", ")}`,
    `- Reason: ${finding.message}`,
    `- Suggestion: ${finding.suggestion}`,
  ].join("\n");
}
