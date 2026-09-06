export { dedupeExactCatalogIds } from "../lib/catalog/catalogDedupe.js";
export { sortCatalogModelsProviderGrouped } from "../lib/catalog/catalogOrder.js";
export {
  disambiguateCatalogModelNames,
  enrichCatalogModelEntry,
} from "../lib/modelMetadataRegistry.js";
export type { CatalogEnrichmentSnapshot } from "../lib/modelMetadataRegistry.js";
export { createModelCapabilityResolutionSnapshot } from "../lib/modelCapabilityResolutionSnapshot.js";
export {
  getModelsCatalogPrefixMode,
  isModelCatalogNamesEnabled,
} from "../shared/utils/featureFlags.js";
export { maybeOmitCatalogModelName } from "../lib/catalog/catalogHelpers.js";
export { mergeCustomModelMetadata } from "../lib/providers/modelMetadataPrecedence.js";
