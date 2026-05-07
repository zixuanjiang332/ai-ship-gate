import type { ChangedFile, FailOn, Finding, Verdict } from "../domain/types.js";
export interface ConsoleChecks {
    tests: boolean;
    dependencies: boolean;
    env: boolean;
    ci: boolean;
    docker: boolean;
    security: boolean;
}
export interface ConsoleRunRequest {
    repoPath: string;
    base?: string;
    failOn: FailOn;
    checks: ConsoleChecks;
}
export interface ConsoleFileEntry {
    path: string;
    status: ChangedFile["status"];
    snippet: string;
    matchedFindingIds: string[];
}
export interface ConsoleResult {
    source: "demo" | "local";
    repoPath: string;
    baseRef: string;
    verdict: Verdict;
    findings: Finding[];
    files: ConsoleFileEntry[];
    findingsCount: number;
    affectedFilesCount: number;
    counts: {
        fail: number;
        warn: number;
        info: number;
    };
    effectiveConfig: {
        failOn: FailOn;
        checks: ConsoleChecks;
    };
}
