import type { FailOn, Finding, Verdict } from "./types.js";

const rank: Record<Verdict, number> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

export function aggregateVerdict(findings: Finding[]): Verdict {
  if (findings.some((finding) => finding.severity === "fail")) {
    return "fail";
  }

  if (findings.some((finding) => finding.severity === "warn")) {
    return "warn";
  }

  return "pass";
}

export function shouldExitWithFailure(verdict: Verdict, failOn: FailOn): boolean {
  return rank[verdict] >= rank[failOn];
}
