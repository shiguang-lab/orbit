/** Compatibility facade; catalog support ownership lives in @shiguang-gateway/provider-catalog. */
export { CONOL_DEFAULT_EFFORT, CONOL_EFFORT_ORDER, CONOL_FALLBACK_MODELS, CONOL_FALLBACK_MODEL_PRESETS, clampConolEffort, conolEffortsForModel, discoverConolModels, parseConolAgentServers, resolveConolModelId, resolveConolModelSelection } from "@shiguang-gateway/provider-catalog/support/services/conolModels";
export type { ConolEffort, ConolModel, ConolModelDiscovery, ConolModelPreset } from "@shiguang-gateway/provider-catalog/support/services/conolModels";
