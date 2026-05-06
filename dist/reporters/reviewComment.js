export const reviewCommentMarkerPrefix = "<!-- releaseguard-ai-review-comment";
export function renderReviewComment(finding, anchor) {
    return [
        `ReleaseGuard AI: ${sanitizeLine(finding.message)}`,
        "",
        `Rule: ${formatInlineCode(finding.id)}`,
        `Suggestion: ${sanitizeLine(finding.suggestion)}`,
        `${reviewCommentMarkerPrefix} rule=${sanitizeAttr(finding.id)} file=${sanitizeAttr(anchor.file)} anchor=${anchor.line} -->`,
    ].join("\n");
}
function formatInlineCode(value) {
    return `\`${sanitizeLine(value)}\``;
}
function sanitizeAttr(value) {
    return value.replaceAll(/\s+/g, "_").replaceAll("--", "-");
}
function sanitizeLine(value) {
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
//# sourceMappingURL=reviewComment.js.map