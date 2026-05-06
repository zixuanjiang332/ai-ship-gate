import type { ChangedFile, Finding, ReviewAnchor } from "../domain/types.js";
export declare function resolveReviewAnchor(finding: Finding, changedFiles: ChangedFile[]): ReviewAnchor | undefined;
