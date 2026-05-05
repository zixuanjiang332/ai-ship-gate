import { describe, expect, it } from "vitest";
import { aggregateVerdict, shouldExitWithFailure } from "../../src/domain/verdict.js";
import type { Finding } from "../../src/domain/types.js";

const finding = (severity: Finding["severity"]): Finding => ({
  id: `test.${severity}`,
  severity,
  title: `${severity} title`,
  message: `${severity} message`,
  files: ["src/example.ts"],
  suggestion: "Review the finding.",
});

describe("aggregateVerdict", () => {
  it("returns fail when any finding fails", () => {
    expect(aggregateVerdict([finding("warn"), finding("fail")])).toBe("fail");
  });

  it("returns warn when findings warn but none fail", () => {
    expect(aggregateVerdict([finding("info"), finding("warn")])).toBe("warn");
  });

  it("returns pass when there are no warnings or failures", () => {
    expect(aggregateVerdict([finding("info")])).toBe("pass");
    expect(aggregateVerdict([])).toBe("pass");
  });
});

describe("shouldExitWithFailure", () => {
  it("uses fail as the default blocking threshold", () => {
    expect(shouldExitWithFailure("warn", "fail")).toBe(false);
    expect(shouldExitWithFailure("fail", "fail")).toBe(true);
  });

  it("can make warnings block CI", () => {
    expect(shouldExitWithFailure("warn", "warn")).toBe(true);
    expect(shouldExitWithFailure("pass", "warn")).toBe(false);
  });
});
