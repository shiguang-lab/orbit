/**
 * Domain and persistence capabilities used by the OpenAI-compatible model catalog runtime.
 * HTTP request handling, response shaping, caching, and protocol aliases live in open-sse.
 */
export { PROVIDER_MODELS, PROVIDER_ID_TO_ALIAS } from "../shared/constants/models.js";
export {
  AI_PROVIDERS,
  NOAUTH_PROVIDERS,
  OAUTH_PROVIDERS,
  APIKEY_PROVIDERS,
} from "../shared/constants/providers.js";
export {
  getCachedRawProviderConnections,
  getCombos,
  getAllCustomModels,
  getSettings,
  getCachedProviderNodes,
  getModelAliases,
  getHiddenModelsByProvider,
} from "../lib/localDb.js";
export { getUserDatabaseSettings } from "../lib/db/databaseSettings.js";
export { createLazyConnectionView } from "../lib/db/providers/lazyConnectionView.js";
export {
  getSyncedAvailableModelsByConnection,
  SYNCED_AVAILABLE_MODELS_MALFORMED,
  type SyncedAvailableModel,
} from "../lib/db/models.js";
export { getAllActiveSyncedModels } from "../lib/db/models/activeSyncedCatalog.js";
export { getModelCatalogCacheVersion } from "../lib/db/readCache.js";
export { getCompatibleFallbackModels } from "../lib/providers/managedAvailableModels.js";
export {
  providerUsesCuratedModelsOnly,
  providerUsesExclusiveSyncedListing,
} from "../lib/providers/modelListingCapability.js";
export { ensureCursorAutoCatalogEntry } from "../lib/providerModels/cursorAutoCatalog.js";
export { mergeCustomModelMetadata } from "../lib/providers/modelMetadataPrecedence.js";
export { getOpenRouterCatalog } from "../lib/catalog/openrouterCatalog.js";
export { hasEligibleConnectionForModel } from "../domain/connectionModelRules.js";
export {
  INTERNAL_PROXY_ERROR,
  getCanonicalModelMetadata,
  getCatalogDiagnosticsHeaders,
  disambiguateCatalogModelNames,
  enrichCatalogModelEntry,
  type CatalogEnrichmentSnapshot,
} from "../lib/modelMetadataRegistry.js";
export { createModelCapabilityResolutionSnapshot } from "../lib/modelCapabilityResolutionSnapshot.js";
export { getModelsDevPricing, getSyncedCapability } from "../lib/modelsDevSync.js";
export { classifyModelSupportedEndpoints } from "../shared/constants/modelSupportedEndpoints.js";
export {
  getModelsCatalogPrefixMode,
  isModelCatalogNamesEnabled,
} from "../shared/utils/featureFlags.js";
export {
  isProviderNodePrefixReserved,
  selectCompatibleNodeForPrefix,
} from "../lib/providerNodePrefixes.js";
export {
  isNoAuthProviderBlocked,
  isNoAuthProviderKey,
  isNoAuthRawProviderPrefix,
  normalizeBlockedProviderSet,
} from "../shared/utils/noAuthProviders.js";
export type { ComboModelStep } from "../lib/combos/steps.js";
export {
  type CustomModelEntry,
  type ComboCatalogTarget,
  type ComboTargetCatalogMetadata,
  type ConnectionScopedReasoningCatalog,
  isPositiveFiniteNumber,
  parseJsonStringArray,
  intersectStringArrays,
  minKnownNumber,
  maybeOmitCatalogModelName,
  getThinkingCapabilityFields,
  mergeComboCapabilities,
  getConnectionScopedEffortTiers,
} from "../lib/catalog/catalogHelpers.js";
export {
  qualifyOpenRouterModelId,
  normalizeOpenRouterModalities,
  getOpenRouterModelType,
  isOpenRouterFreeModel,
  getOpenRouterDisplayName,
} from "../lib/catalog/catalogOpenrouter.js";
export {
  getVisionCapabilityFields,
  getCustomVisionCapabilityFields,
} from "../lib/catalog/catalogVision.js";
export { extractAliasBackedModels } from "../lib/catalog/aliasBackedModels.js";
export {
  buildSyncedModelIdsByCanonicalProvider,
  shouldSuppressStaticModelForExclusiveListing,
} from "../lib/catalog/catalogSyncedCoverage.js";
export { incrementCcDiscoveryHitCount } from "../lib/db/ccDiscoveryMetrics.js";
export { isFreeModel } from "../shared/utils/freeModels.js";
export { isCodexDiscoveryModelExcluded } from "../shared/services/codexDiscoveryPolicy.js";
export {
  isCcAliasGlobalEnabled,
  getCcAliasSettingsBulk,
} from "../lib/db/ccDiscoveryAliases.js";
export {
  isFunctionalGatewayGlobalEnabled,
  getFunctionalGatewaySettingsBulk,
} from "../lib/db/functionalGatewayMirrors.js";
export { buildCcAliasPredicate } from "../lib/catalog/ccAliasPredicate.js";
export { buildFunctionalGatewayPredicate } from "../lib/catalog/functionalGatewayPredicate.js";
export { dedupeExactCatalogIds } from "../lib/catalog/catalogDedupe.js";
export { sortCatalogModelsProviderGrouped } from "../lib/catalog/catalogOrder.js";
export { isAuthRequired, isDashboardSessionAuthenticated } from "../shared/utils/apiAuth.js";
