import type { Finding } from "../domain/types.js";

export const reviewCommentMarkerPrefix = "<!-- releaseguard-ai-review-comment";

export function renderReviewComment(
  finding: Finding,
  anchor: { file: string; line: number },
): string {
  return [
    `ReleaseGuard AI: ${sanitizeLine(finding.message)}`,
    "",
    `Rule: ${formatInlineCode(finding.id)}`,
    `Suggestion: ${sanitizeLine(finding.suggestion)}`,
    `${reviewCommentMarkerPrefix} rule=${sanitizeAttr(finding.id)} file=${sanitizeAttr(anchor.file)} anchor=${anchor.line} -->`,
  ].join("\n");
}

function formatInlineCode(value: string): string {
  return `\`${sanitizeLine(value)}\``;
}

function sanitizeAttr(value: string): string {
  return value.replaceAll(/\s+/g, "_").replaceAll("--", "-");
}

function sanitizeLine(value: string): string {
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
