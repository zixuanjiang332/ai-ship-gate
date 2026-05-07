import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveReviewAnchor } from "./action/diffAnchors.js";
import { upsertPullRequestComment as defaultPublishPrComment } from "./action/prComment.js";
import { publishReviewComments as defaultPublishReviewComments } from "./action/reviewComments.js";
import type { Finding, GateReport } from "./domain/types.js";
import { renderActionSummary, summarizeFindings } from "./reporters/actionSummary.js";
import { renderPrComment } from "./reporters/prComment.js";
import { renderReviewComment } from "./reporters/reviewComment.js";
import { runCheck as defaultRunCheck } from "./run.js";

interface ActionOptions {
  env?: Record<string, string | undefined>;
  runCheck?: typeof defaultRunCheck;
  publishPrComment?: (target: PullRequestCommentContext & { token: string }, report: GateReport) => Promise<void>;
  publishReviewComments?: (
    target: PullRequestReviewCommentContext & { token: string },
    comments: ReviewCommentPayload[],
  ) => Promise<void>;
}

export async function runAction(options: ActionOptions = {}): Promise<number> {
  const env = options.env ?? process.env;
  const runCheck = options.runCheck ?? defaultRunCheck;
  const publishPrComment = options.publishPrComment ?? publishPullRequestComment;
  const publishReviewComments = options.publishReviewComments ?? defaultPublishReviewComments;
  const cwd = env.GITHUB_WORKSPACE ?? process.cwd();
  const base = env.INPUT_BASE || undefined;
  const ai = env.INPUT_AI?.trim().toLowerCase() === "true";
  const prCommentMode = normalizePrCommentMode(env.INPUT_PR_COMMENT ?? env["INPUT_PR-COMMENT"]);
  const reviewCommentsMode = normalizeReviewCommentsMode(
    env.INPUT_REVIEW_COMMENTS ?? env["INPUT_REVIEW-COMMENTS"],
  );

  const result = await runCheck({
    cwd,
    base,
    format: "markdown",
    ai,
  });

  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, renderActionSummary(result.report));
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, renderActionOutputs(result.report));
  if (shouldPublishPrComment(prCommentMode, env.GITHUB_EVENT_NAME, result.report.verdict)) {
    const target = await readPullRequestTarget(env);
    if (target) {
      await publishPrComment(
        {
          ...target,
          token: env.GITHUB_TOKEN ?? "",
        },
        {
          ...result.report,
          aiSummary: result.report.aiSummary,
        },
      );
    }
  }
  if (shouldPublishReviewComments(reviewCommentsMode, env.GITHUB_EVENT_NAME)) {
    const target = await readPullRequestReviewTarget(env);
    if (target) {
      const comments = selectReviewCommentFindings(reviewCommentsMode, result.report.findings)
        .map((finding) => {
          const anchor = resolveReviewAnchor(finding, result.context.changedFiles);
          if (!anchor) return undefined;
          return {
            body: renderReviewComment(finding, anchor),
            file: anchor.file,
            line: anchor.line,
          };
        })
        .filter((comment): comment is ReviewCommentPayload => Boolean(comment));

      if (comments.length > 0) {
        try {
          await publishReviewComments(
            {
              ...target,
              token: env.GITHUB_TOKEN ?? "",
            },
            comments,
          );
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`ReleaseGuard inline review comments failed: ${message}`);
        }
      }
    }
  }

  return result.exitCode;
}

function renderActionOutputs(report: GateReport): string {
  const counts = summarizeFindings(report);
  return [
    `verdict=${report.verdict}`,
    `findings-count=${counts.findingsCount}`,
    `fail-count=${counts.failCount}`,
    `warn-count=${counts.warnCount}`,
    "",
  ].join("\n");
}

type PrCommentMode = "off" | "on-failure" | "always";
type ReviewCommentsMode = "off" | "fail-only" | "smart" | "always";

interface PullRequestCommentContext {
  owner: string;
  repo: string;
  issueNumber: number;
}

interface PullRequestReviewCommentContext {
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string;
}

interface ReviewCommentPayload {
  body: string;
  file: string;
  line: number;
}

interface PullRequestEventPayload {
  pull_request?: { number?: number; head?: { sha?: string } };
  repository?: { owner?: { login?: string }; name?: string };
}

async function readPullRequestTarget(
  env: Record<string, string | undefined>,
): Promise<PullRequestCommentContext | undefined> {
  const event = await readPullRequestEvent(env);
  if (!event) return undefined;

  const issueNumber = event.pull_request?.number;
  const owner = event.repository?.owner?.login;
  const repo = event.repository?.name;

  if (!issueNumber || !owner || !repo) return undefined;

  return { owner, repo, issueNumber };
}

async function readPullRequestReviewTarget(
  env: Record<string, string | undefined>,
): Promise<PullRequestReviewCommentContext | undefined> {
  const event = await readPullRequestEvent(env);
  if (!event) return undefined;

  const pullNumber = event.pull_request?.number;
  const commitId = event.pull_request?.head?.sha;
  const owner = event.repository?.owner?.login;
  const repo = event.repository?.name;

  if (!pullNumber || !commitId || !owner || !repo) return undefined;

  return { owner, repo, pullNumber, commitId };
}

async function readPullRequestEvent(
  env: Record<string, string | undefined>,
): Promise<PullRequestEventPayload | undefined> {
  if (!env.GITHUB_EVENT_PATH || !env.GITHUB_TOKEN) return undefined;

  return JSON.parse(await readFile(env.GITHUB_EVENT_PATH, "utf8")) as PullRequestEventPayload;
}

function shouldPublishPrComment(mode: PrCommentMode, eventName: string | undefined, verdict: GateReport["verdict"]): boolean {
  if (eventName !== "pull_request") return false;
  if (mode === "off") return false;
  if (mode === "always") return true;
  return verdict === "fail";
}

function shouldPublishReviewComments(mode: ReviewCommentsMode, eventName: string | undefined): boolean {
  return eventName === "pull_request" && mode !== "off";
}

function normalizePrCommentMode(value: string | undefined): PrCommentMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "always" || normalized === "on-failure") return normalized;
  return "off";
}

function normalizeReviewCommentsMode(value: string | undefined): ReviewCommentsMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "always" || normalized === "fail-only" || normalized === "smart") {
    return normalized;
  }
  return "off";
}

function selectReviewCommentFindings(mode: ReviewCommentsMode, findings: Finding[]): Finding[] {
  const smartAllowlist = new Set([
    "security.secret-in-diff",
    "dependencies.lockfile-not-updated",
    "env.example-not-updated",
    "tests.missing-related-tests",
  ]);

  if (mode === "always") return findings;
  if (mode === "fail-only") return findings.filter((finding) => finding.severity === "fail");
  if (mode === "smart") {
    return findings.filter((finding) => finding.severity === "fail" || smartAllowlist.has(finding.id));
  }
  return [];
}

async function publishPullRequestComment(
  target: PullRequestCommentContext & { token: string },
  report: GateReport,
): Promise<void> {
  await defaultPublishPrComment({
    ...target,
    body: renderPrComment(report),
  });
}

export function isDirectRun(argv: string[], importMetaUrl: string): boolean {
  return argv[1] !== undefined && fileURLToPath(importMetaUrl) === resolve(argv[1]);
}

if (isDirectRun(process.argv, import.meta.url)) {
  runAction()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
