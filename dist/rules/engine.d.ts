import type { Finding, GateContext, ShipGateConfig } from "../domain/types.js";
export interface Rule {
    id: string;
    check: keyof ShipGateConfig["checks"];
    run(context: GateContext): Finding[];
}
export declare function runRules(context: GateContext, rules: Rule[]): Finding[];
