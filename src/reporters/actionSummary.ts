import type { Finding, GateReport } from "../domain/types.js";

const productName = "ReleaseGuard AI";
const maxSummaryFindings = 10;

export interface FindingSummary {
  findingsCount: number;
  failCount: number;
  warnCount: number;
  infoCount: number;
}

export function summarizeFindings(report: GateReport): FindingSummary {
  return {
    findingsCount: report.findings.length,
    failCount: report.findings.filter((finding) => finding.severity === "fail").length,
    warnCount: report.findings.filter((finding) => finding.severity === "warn").length,
    infoCount: report.findings.filter((finding) => finding.severity === "info").length,
  };
}

export function renderActionSummary(report: GateReport): string {
  const counts = summarizeFindings(report);
  const verdict = report.verdict.toUpperCase();
  const lines = [
    `# ${productName}: ${verdict}`,
    "",
    "| Verdict | Findings | Fail | Warn | Info |",
    "| --- | ---: | ---: | ---: | ---: |",
    `| ${verdict} | ${counts.findingsCount} | ${counts.failCount} | ${counts.warnCount} | ${counts.infoCount} |`,
    "",
  ];

  if (report.findings.length === 0) {
    lines.push("No release risks detected.", "");
  } else {
    lines.push("## Top Findings", "", "| Severity | Rule | Files | Suggestion |", "| --- | --- | --- | --- |");
    for (const finding of report.findings.slice(0, maxSummaryFindings)) {
      lines.push(formatFindingRow(finding));
    }
    if (report.findings.length > maxSummaryFindings) {
      lines.push("", `Showing first ${maxSummaryFindings} of ${report.findings.length} findings.`);
    }
    lines.push("");
  }

  if (report.aiSummary) {
    lines.push("## AI Summary", "", sanitizeMarkdownBlockText(report.aiSummary), "");
  }

  return lines.join("\n");
}

function formatFindingRow(finding: Finding): string {
  return [
    finding.severity.toUpperCase(),
    formatInlineCode(finding.id),
    formatFiles(finding.files),
    sanitizeTableText(finding.suggestion),
  ].join(" | ").replace(/^/, "| ").replace(/$/, " |");
}

function formatFiles(files: string[]): string {
  if (files.length === 0) return "-";
  return files.map((file) => formatInlineCode(file)).join(", ");
}

function formatInlineCode(value: string): string {
  const sanitized = sanitizeTableText(value);
  if (sanitized.includes("\\`")) return sanitized;
  return `\`${sanitized}\``;
}

function sanitizeTableText(value: string): string {
  return sanitizeMarkdownText(value).replaceAll("|", "\\|");
}

function sanitizeMarkdownText(value: string): string {
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

function sanitizeMarkdownBlockText(value: string): string {
  return sanitizeMarkdownText(value).replace(
    /^(\s*)((?:#{1,6}|[-*+>])(?=\s)|\d+\.(?=\s)|-{3,}(?=\s|$))/,
    "$1\\$2",
  );
}
