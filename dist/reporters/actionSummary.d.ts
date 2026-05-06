import type { GateReport } from "../domain/types.js";
export interface FindingSummary {
    findingsCount: number;
    failCount: number;
    warnCount: number;
    infoCount: number;
}
export declare function summarizeFindings(report: GateReport): FindingSummary;
export declare function renderActionSummary(report: GateReport): string;
