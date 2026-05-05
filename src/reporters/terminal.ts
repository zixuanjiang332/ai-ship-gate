import pc from "picocolors";
import type { Finding, GateReport, Verdict } from "../domain/types.js";

export function renderTerminal(report: GateReport, options: { color?: boolean } = {}): string {
  const color = options.color ?? true;
  const paint = color ? colorFor(report.verdict) : (value: string) => value;
  const lines = [paint(`AI Ship Gate: ${report.verdict.toUpperCase()}`), ""];

  if (report.aiSummary) {
    lines.push("AI Summary", report.aiSummary, "");
  }

  if (report.findings.length === 0) {
    lines.push("No release risks detected.", "");
    return lines.join("\n");
  }

  for (const finding of report.findings) {
    lines.push(formatFinding(finding), "");
  }

  return lines.join("\n");
}

function formatFinding(finding: Finding): string {
  return [
    `[${finding.severity.toUpperCase()}] ${finding.title}`,
    `Rule: ${finding.id}`,
    `Files: ${finding.files.join(", ")}`,
    `Reason: ${finding.message}`,
    `Suggestion: ${finding.suggestion}`,
  ].join("\n");
}

function colorFor(verdict: Verdict): (value: string) => string {
  if (verdict === "fail") return pc.red;
  if (verdict === "warn") return pc.yellow;
  return pc.green;
}
