import { maybeExplainWithAi } from "./ai/explain.js";
import { loadConfig } from "./config/loadConfig.js";
import type { CheckOptions, CheckResult, GateReport, ShipGateConfig } from "./domain/types.js";
import { aggregateVerdict, shouldExitWithFailure } from "./domain/verdict.js";
import { collectGitContext } from "./git/git.js";
import { renderReport } from "./reporters/index.js";
import { runRules } from "./rules/engine.js";
import { defaultRules } from "./rules/index.js";

export async function runCheck(options: CheckOptions): Promise<CheckResult> {
  const collectContext = options.collectContext ?? collectGitContext;
  const context = await collectContext({ cwd: options.cwd, base: options.base });
  const config = await loadConfig(context.repoRoot);
  const enabledRules = defaultRules.filter((rule) => isRuleEnabled(rule.check, config.checks));
  const findings = runRules(context, enabledRules);
  const verdict = aggregateVerdict(findings);
  const aiSummary = await maybeExplainWithAi({
    enabled: options.ai || config.ai.enabled,
    report: { verdict, findings },
  });
  const report: GateReport = {
    verdict,
    findings,
    ...(aiSummary ? { aiSummary } : {}),
  };
  const rendered = renderReport(report, options.format);
  const write = options.write ?? ((output: string) => process.stdout.write(output));

  write(rendered);

  return {
    report,
    rendered,
    exitCode: shouldExitWithFailure(verdict, config.failOn) ? 1 : 0,
  };
}

function isRuleEnabled(ruleCheck: keyof ShipGateConfig["checks"], checks: ShipGateConfig["checks"]): boolean {
  return checks[ruleCheck];
}
