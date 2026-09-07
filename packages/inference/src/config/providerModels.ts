/** Compatibility facade; catalog ownership lives in @orbit/providers. */
export { CLAUDE_EFFORT_SUFFIXES, PROVIDER_ID_TO_ALIAS, PROVIDER_MODELS, findModelName, findRegistryModelById, findRegistryScoresAs, getDefaultModel, getModelStripTypes, getModelTargetFormat, getModelTimeoutMs, getModelsByProviderId, getProviderModel, getProviderModels, isValidModel, splitClaudeEffortSuffix, supportsClaudeMaxEffort, supportsXHighEffort, supportsXHighEffortForMaxNormalization } from "@orbit/providers/provider-models";
export type { ClaudeEffortSuffix } from "@orbit/providers/provider-models";
