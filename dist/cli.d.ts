#!/usr/bin/env node
import { Command } from "commander";
import type { OutputFormat } from "./domain/types.js";
export declare function buildProgram(): Command;
export declare function parseOutputFormat(value: string): OutputFormat;
