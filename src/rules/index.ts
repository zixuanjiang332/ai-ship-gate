import type { Rule } from "./engine.js";
import { ciRiskRule, dockerRiskRule } from "./ciDeploy.js";
import { dependencyRiskRule } from "./dependencies.js";
import { envRiskRule } from "./env.js";
import { securityRiskRule } from "./security.js";
import { testRiskRule } from "./tests.js";

export const defaultRules: Rule[] = [
  testRiskRule,
  dependencyRiskRule,
  envRiskRule,
  ciRiskRule,
  dockerRiskRule,
  securityRiskRule,
];
