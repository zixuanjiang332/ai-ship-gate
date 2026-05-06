import type { Finding } from "../domain/types.js";
export declare const reviewCommentMarkerPrefix = "<!-- releaseguard-ai-review-comment";
export declare function renderReviewComment(finding: Finding, anchor: {
    file: string;
    line: number;
}): string;
