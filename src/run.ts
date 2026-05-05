import type { CheckOptions, GateReport } from "./domain/types.js";

export async function runCheck(_options: CheckOptions): Promise<GateReport> {
  return {
    verdict: "pass",
    findings: [],
  };
}
