import { runCheck as defaultRunCheck } from "./run.js";
interface ActionOptions {
    env?: Record<string, string | undefined>;
    runCheck?: typeof defaultRunCheck;
}
export declare function runAction(options?: ActionOptions): Promise<number>;
export declare function isDirectRun(argv: string[], importMetaUrl: string): boolean;
export {};
