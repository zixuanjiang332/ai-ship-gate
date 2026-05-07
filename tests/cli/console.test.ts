import { describe, expect, it } from "vitest";
import { buildProgram } from "../../src/cli.js";

describe("buildProgram", () => {
  it("registers the console command", () => {
    const program = buildProgram();
    const command = program.commands.find((entry) => entry.name() === "console");

    expect(command).toBeDefined();
    expect(command?.description()).toContain("local browser console");
    expect(command?.options.some((option) => option.long === "--port")).toBe(true);
  });
});
