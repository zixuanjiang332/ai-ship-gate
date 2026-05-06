import type { ReleaseGuardConfig } from "../domain/types.js";

export const defaultConfig: ReleaseGuardConfig = {
  failOn: "fail",
  ai: {
    enabled: false,
  },
  checks: {
    tests: true,
    dependencies: true,
    ci: true,
    docker: true,
    env: true,
    security: true,
  },
};
