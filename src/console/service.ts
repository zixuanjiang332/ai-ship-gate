import type { ChangedFile, Finding } from "../domain/types.js";
import { runCheck as defaultRunCheck } from "../run.js";
import type { ConsoleFileEntry, ConsoleResult, ConsoleRunRequest } from "./contracts.js";

export async function runConsoleCheck(
  request: ConsoleRunRequest,
  runCheck: typeof defaultRunCheck = defaultRunCheck,
): Promise<ConsoleResult> {
  const result = await runCheck({
    cwd: request.repoPath,
    base: request.base,
    format: "json",
    ai: false,
    configOverride: {
      failOn: request.failOn,
      checks: request.checks,
    },
    write: () => {},
  });
  const counts = result.report.findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { fail: 0, warn: 0, info: 0 },
  );
  const affectedFiles = new Set(result.report.findings.flatMap((finding) => finding.files));
  const files = buildConsoleFileEntries(result.context.changedFiles, result.report.findings);

  return {
    source: "local",
    repoPath: result.context.repoRoot,
    baseRef: result.context.baseRef,
    verdict: result.report.verdict,
    findings: result.report.findings,
    files,
    findingsCount: result.report.findings.length,
    affectedFilesCount: affectedFiles.size,
    counts,
    effectiveConfig: {
      failOn: request.failOn,
      checks: request.checks,
    },
  };
}

function buildConsoleFileEntries(changedFiles: ChangedFile[], findings: Finding[]): ConsoleFileEntry[] {
  const matchedFindingIds = new Map<string, Set<string>>();

  for (const finding of findings) {
    for (const file of finding.files) {
      const ids = matchedFindingIds.get(file) ?? new Set<string>();
      ids.add(finding.id);
      matchedFindingIds.set(file, ids);
    }
  }

  return changedFiles
    .filter((file) => matchedFindingIds.has(file.path))
    .map((file) => ({
      path: file.path,
      status: file.status,
      snippet: toSnippet(file.patch),
      matchedFindingIds: [...(matchedFindingIds.get(file.path) ?? new Set<string>())],
    }));
}

function toSnippet(patch: string): string {
  return patch.trim().split("\n").slice(0, 10).join("\n");
}
