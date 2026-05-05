import type { GateReport } from "../domain/types.js";
interface ExplainOptions {
    enabled: boolean;
    report: Pick<GateReport, "verdict" | "findings">;
    env?: Record<string, string | undefined>;
    fetch?: typeof fetch;
}
export declare function maybeExplainWithAi(options: ExplainOptions): Promise<string | undefined>;
export {};
