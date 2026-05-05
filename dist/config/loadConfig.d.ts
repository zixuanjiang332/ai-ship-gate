import type { ShipGateConfig } from "../domain/types.js";
type CheckName = keyof ShipGateConfig["checks"];
interface ConfigInput {
    failOn?: ShipGateConfig["failOn"];
    ai?: {
        enabled?: boolean;
    };
    checks?: Partial<Record<CheckName, boolean>>;
}
export declare function loadConfig(cwd: string): Promise<ShipGateConfig>;
export declare function mergeConfig(config: ConfigInput): ShipGateConfig;
export {};
