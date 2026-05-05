import { ciRiskRule, dockerRiskRule } from "./ciDeploy.js";
import { dependencyRiskRule } from "./dependencies.js";
import { envRiskRule } from "./env.js";
import { securityRiskRule } from "./security.js";
import { testRiskRule } from "./tests.js";
export const defaultRules = [
    testRiskRule,
    dependencyRiskRule,
    envRiskRule,
    ciRiskRule,
    dockerRiskRule,
    securityRiskRule,
];
//# sourceMappingURL=index.js.map