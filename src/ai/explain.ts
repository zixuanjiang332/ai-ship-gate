import type { GateReport } from "../domain/types.js";

export async function maybeExplainWithAi(_options: {
  enabled: boolean;
  report: Pick<GateReport, "verdict" | "findings">;
}): Promise<string | undefined> {
  return undefined;
}
