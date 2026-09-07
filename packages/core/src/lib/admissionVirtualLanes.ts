import { providerRuntimePorts } from "../runtime/providerRuntimePorts.js";
import { getFeatureFlagOverride } from "./db/featureFlags.js";

export const ADAPTIVE_VIRTUAL_LANES_FLAG_KEY = "SHIGUANG_GATEWAY_CHAT_VIRTUAL_LANES";

export type AdaptiveVirtualLanesFlagState = {
  enabled: boolean;
  source: "env" | "db" | "default";
};

export type AdaptiveVirtualLanesFlagDeps = {
  env?: NodeJS.ProcessEnv;
  getOverride?: (key: string) => string | undefined;
};

const ENV_ON = new Set(["1", "true"]);

export function resolveAdaptiveVirtualLanesFlag(
  deps: AdaptiveVirtualLanesFlagDeps = {},
): AdaptiveVirtualLanesFlagState {
  const env = deps.env ?? process.env;
  const envValue = env[ADAPTIVE_VIRTUAL_LANES_FLAG_KEY];
  if (envValue !== undefined && envValue !== "") {
    return { enabled: ENV_ON.has(envValue), source: "env" };
  }
  const dbOverride = (deps.getOverride ?? getFeatureFlagOverride)(ADAPTIVE_VIRTUAL_LANES_FLAG_KEY);
  if (dbOverride !== undefined) {
    return {
      enabled: dbOverride === "true" || dbOverride === "1" || dbOverride === "yes",
      source: "db",
    };
  }
  return { enabled: false, source: "default" };
}

export type AdaptiveVirtualLanesWarmDeps = {
  resolve?: (deps?: AdaptiveVirtualLanesFlagDeps) => AdaptiveVirtualLanesFlagState;
  reload?: (options: { env?: NodeJS.ProcessEnv }) => unknown;
};

export async function warmAdaptiveVirtualLanesIntoRuntime(
  deps: AdaptiveVirtualLanesWarmDeps = {},
): Promise<boolean> {
  const state = (deps.resolve ?? resolveAdaptiveVirtualLanesFlag)();
  if (state.source !== "db") return false;
  (deps.reload ?? providerRuntimePorts.reloadAdaptiveAdmissionRuntime)({
    env: {
      ...process.env,
      [ADAPTIVE_VIRTUAL_LANES_FLAG_KEY]: state.enabled ? "1" : "0",
    },
  });
  return true;
}
