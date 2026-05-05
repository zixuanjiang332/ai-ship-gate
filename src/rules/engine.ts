import type { Finding, GateContext, ShipGateConfig } from "../domain/types.js";

export interface Rule {
  id: string;
  check: keyof ShipGateConfig["checks"];
  run(context: GateContext): Finding[];
}

export function runRules(context: GateContext, rules: Rule[]): Finding[] {
  return rules.flatMap((rule) => rule.run(context));
}
