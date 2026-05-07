import { maybeExplainWithAi } from "./ai/explain.js";
import { loadConfig } from "./config/loadConfig.js";
import { aggregateVerdict, shouldExitWithFailure } from "./domain/verdict.js";
import { collectGitContext } from "./git/git.js";
import { renderReport } from "./reporters/index.js";
import { runRules } from "./rules/engine.js";
import { defaultRules } from "./rules/index.js";
export async function runCheck(options) {
    const collectContext = options.collectContext ?? collectGitContext;
    const context = await collectContext({ cwd: options.cwd, base: options.base });
    const loadedConfig = await loadConfig(context.repoRoot);
    const config = applyConfigOverride(loadedConfig, options.configOverride);
    const enabledRules = defaultRules.filter((rule) => isRuleEnabled(rule.check, config.checks));
    const findings = runRules(context, enabledRules);
    const verdict = aggregateVerdict(findings);
    const aiSummary = await maybeExplainWithAi({
        enabled: options.ai || config.ai.enabled,
        report: { verdict, findings },
    });
    const report = {
        verdict,
        findings,
        ...(aiSummary ? { aiSummary } : {}),
    };
    const rendered = renderReport(report, options.format);
    const write = options.write ?? ((output) => process.stdout.write(output));
    write(rendered);
    return {
        context,
        report,
        rendered,
        exitCode: shouldExitWithFailure(verdict, config.failOn) ? 1 : 0,
    };
}
function isRuleEnabled(ruleCheck, checks) {
    return checks[ruleCheck];
}
function applyConfigOverride(config, override) {
    if (!override) {
        return config;
    }
    return {
        ...config,
        failOn: override.failOn ?? config.failOn,
        checks: {
            ...config.checks,
            ...override.checks,
        },
    };
}
//# sourceMappingURL=run.js.map