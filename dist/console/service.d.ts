import { runCheck as defaultRunCheck } from "../run.js";
import type { ConsoleResult, ConsoleRunRequest } from "./contracts.js";
export declare function runConsoleCheck(request: ConsoleRunRequest, runCheck?: typeof defaultRunCheck): Promise<ConsoleResult>;
