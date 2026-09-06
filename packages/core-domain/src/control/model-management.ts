/**
 * Shared model-management capabilities consumed by the control-plane app.
 * HTTP routing, request parsing, and response orchestration belong to control-api.
 */
export {
  deleteModelAlias,
  getModelAliases,
  setModelAlias,
} from "../lib/db/models/aliases.js";
export { getProviderConnections } from "../lib/db/providers.js";
export { isCloudEnabled } from "../lib/db/settings.js";
export { syncToCloud } from "../lib/cloudSync.js";
export { getSettings } from "../lib/db/settings.js";
export { getConsistentMachineId } from "../shared/utils/machineId.js";
export { isAuthenticated } from "../shared/utils/apiAuth.js";
export { isFreeModel, providerHasFreeModels } from "../shared/utils/freeModels.js";
export { isValidationFailure, validateBody } from "../shared/validation/helpers.js";
export {
  cloudModelAliasUpdateSchema,
  updateModelAliasSchema,
} from "../shared/validation/schemas.js";
export { AI_MODELS, PROVIDER_ID_TO_ALIAS } from "../shared/constants/models.js";
export { AI_PROVIDERS } from "../shared/constants/providers.js";
export { hasEligibleConnectionForModel } from "../domain/connectionModelRules.js";
export {
  createModelCapabilityResolutionSnapshot,
  getResolvedModelCapabilities,
} from "../lib/modelCapabilities.js";
export { getAllActiveSyncedModels } from "../lib/db/models/activeSyncedCatalog.js";
export { providerUsesExclusiveSyncedListing } from "../lib/providers/modelListingCapability.js";
export {
  buildSyncedModelIdsByCanonicalProvider,
  shouldSuppressStaticModelForExclusiveListing,
} from "../lib/catalog/catalogSyncedCoverage.js";
export {
  getOpenRouterCatalog,
  refreshOpenRouterCatalog,
} from "../lib/catalog/openrouterCatalog.js";
export {
  INTERNAL_PROXY_ERROR,
  getCatalogDiagnosticsHeaders,
  resolveModelAliasLookup,
} from "../lib/modelMetadataRegistry.js";
