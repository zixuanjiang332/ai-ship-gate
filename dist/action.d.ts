import type { GateReport } from "./domain/types.js";
import { runCheck as defaultRunCheck } from "./run.js";
interface ActionOptions {
    env?: Record<string, string | undefined>;
    runCheck?: typeof defaultRunCheck;
    publishPrComment?: (target: PullRequestCommentContext & {
        token: string;
    }, report: GateReport) => Promise<void>;
}
export declare function runAction(options?: ActionOptions): Promise<number>;
interface PullRequestCommentContext {
    owner: string;
    repo: string;
    issueNumber: number;
}
export declare function isDirectRun(argv: string[], importMetaUrl: string): boolean;
export {};
