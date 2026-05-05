import pc from "picocolors";
import type { Finding, GateReport, Verdict } from "../domain/types.js";

export function renderTerminal(report: GateReport, options: { color?: boolean } = {}): string {
  const color = options.color ?? true;
  const paint = color ? colorFor(report.verdict) : (value: string) => value;
  const lines = [paint(`AI Ship Gate: ${report.verdict.toUpperCase()}`), ""];

  if (report.aiSummary) {
    lines.push("AI Summary", sanitizeTerminalText(report.aiSummary), "");
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
    `[${finding.severity.toUpperCase()}] ${sanitizeTerminalText(finding.title)}`,
    `Rule: ${sanitizeTerminalText(finding.id)}`,
    `Files: ${finding.files.map((file) => sanitizeTerminalText(file)).join(", ")}`,
    `Reason: ${sanitizeTerminalText(finding.message)}`,
    `Suggestion: ${sanitizeTerminalText(finding.suggestion)}`,
  ].join("\n");
}

function colorFor(verdict: Verdict): (value: string) => string {
  if (verdict === "fail") return pc.red;
  if (verdict === "warn") return pc.yellow;
  return pc.green;
}

function sanitizeTerminalText(value: string): string {
  return value
    .replaceAll(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
    .replaceAll(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replaceAll(/[\r\n]+/g, " ")
    .replaceAll(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
}
