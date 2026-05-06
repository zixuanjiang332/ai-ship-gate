import type { ReleaseGuardConfig } from "../domain/types.js";
type CheckName = keyof ReleaseGuardConfig["checks"];
interface ConfigInput {
    failOn?: ReleaseGuardConfig["failOn"];
    ai?: {
        enabled?: boolean;
    };
    checks?: Partial<Record<CheckName, boolean>>;
}
export declare const CONFIG_FILE_NAME = "releaseguard.config.yaml";
export declare function loadConfig(cwd: string): Promise<ReleaseGuardConfig>;
export declare function mergeConfig(config: ConfigInput): ReleaseGuardConfig;
export {};
