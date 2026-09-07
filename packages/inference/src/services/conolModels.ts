/** Compatibility facade; catalog support ownership lives in @orbit/providers. */
export { CONOL_DEFAULT_EFFORT, CONOL_EFFORT_ORDER, CONOL_FALLBACK_MODELS, CONOL_FALLBACK_MODEL_PRESETS, clampConolEffort, conolEffortsForModel, discoverConolModels, parseConolAgentServers, resolveConolModelId, resolveConolModelSelection } from "@orbit/providers/support/services/conolModels";
export type { ConolEffort, ConolModel, ConolModelDiscovery, ConolModelPreset } from "@orbit/providers/support/services/conolModels";
