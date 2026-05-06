const schemaUri = "https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json";
const informationUri = "https://github.com/zixuanjiang332/releaseguard-ai";
export function renderSarif(report) {
    return `${JSON.stringify(toSarifLog(report), null, 2)}\n`;
}
function toSarifLog(report) {
    return {
        $schema: schemaUri,
        version: "2.1.0",
        runs: [
            {
                tool: {
                    driver: {
                        name: "ReleaseGuard AI",
                        informationUri,
                        rules: uniqueRules(report.findings),
                    },
                },
                results: report.findings.map(toSarifResult),
            },
        ],
    };
}
function uniqueRules(findings) {
    const rules = new Map();
    for (const finding of findings) {
        if (!rules.has(finding.id)) {
            rules.set(finding.id, toSarifRule(finding));
        }
    }
    return [...rules.values()];
}
function toSarifRule(finding) {
    return {
        id: finding.id,
        name: finding.id,
        shortDescription: {
            text: cleanText(finding.title),
        },
        fullDescription: {
            text: cleanText(finding.message),
        },
        help: {
            text: cleanText(finding.suggestion),
        },
        properties: {
            releaseguardSeverity: finding.severity,
        },
    };
}
function toSarifResult(finding) {
    return {
        ruleId: finding.id,
        level: levelFor(finding.severity),
        message: {
            text: `${cleanText(finding.title)}: ${cleanText(finding.message)} Suggestion: ${cleanText(finding.suggestion)}`,
        },
        ...(finding.files.length > 0 ? { locations: finding.files.map(toLocation) } : {}),
    };
}
function toLocation(path) {
    return {
        physicalLocation: {
            artifactLocation: {
                uri: path.replaceAll("\\", "/"),
            },
        },
    };
}
function levelFor(severity) {
    if (severity === "fail")
        return "error";
    if (severity === "warn")
        return "warning";
    return "note";
}
function cleanText(value) {
    return value.replaceAll(/[\r\n]+/g, " ");
}
//# sourceMappingURL=sarif.js.map