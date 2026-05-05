import type { ShipGateConfig } from "../domain/types.js";

export const defaultConfig: ShipGateConfig = {
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
