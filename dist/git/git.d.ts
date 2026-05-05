import type { ChangedFile, GateContext } from "../domain/types.js";
type Exec = (args: string[], cwd: string) => Promise<string>;
export declare function collectGitContext(options: {
    cwd: string;
    base?: string;
    exec?: Exec;
}): Promise<GateContext>;
export declare function parseChangedFiles(nameStatus: string, patch: string): ChangedFile[];
export declare function parseNameStatus(nameStatus: string): Array<Omit<ChangedFile, "patch">>;
export {};
