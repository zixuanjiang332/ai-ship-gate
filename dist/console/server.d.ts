import { type Server } from "node:http";
import type { ConsoleResult, ConsoleRunRequest } from "./contracts.js";
export interface CreateConsoleServerOptions {
    port: number;
    assetRoot?: string;
    demoResult?: ConsoleResult;
    runConsoleCheck?: (request: ConsoleRunRequest) => Promise<ConsoleResult>;
}
export declare function createConsoleServer(options: CreateConsoleServerOptions): Promise<Server>;
