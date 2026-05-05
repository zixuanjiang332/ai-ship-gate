export function runRules(context, rules) {
    return rules.flatMap((rule) => rule.run(context));
}
//# sourceMappingURL=engine.js.map