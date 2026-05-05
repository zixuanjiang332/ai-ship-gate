import type { FailOn, Finding, Verdict } from "./types.js";
export declare function aggregateVerdict(findings: Finding[]): Verdict;
export declare function shouldExitWithFailure(verdict: Verdict, failOn: FailOn): boolean;
