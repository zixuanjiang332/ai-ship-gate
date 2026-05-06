import type { Finding, GateContext, ReleaseGuardConfig } from "../domain/types.js";
export interface Rule {
    id: string;
    check: keyof ReleaseGuardConfig["checks"];
    run(context: GateContext): Finding[];
}
export declare function runRules(context: GateContext, rules: Rule[]): Finding[];
