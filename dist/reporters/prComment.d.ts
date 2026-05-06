import type { GateReport } from "../domain/types.js";
export declare const releaseGuardCommentMarker = "<!-- releaseguard-ai-comment -->";
export declare function renderPrComment(report: GateReport): string;
