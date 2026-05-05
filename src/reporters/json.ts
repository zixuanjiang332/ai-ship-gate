import type { GateReport } from "../domain/types.js";

export function renderJson(report: GateReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
