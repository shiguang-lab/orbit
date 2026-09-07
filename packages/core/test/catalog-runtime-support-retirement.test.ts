import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string }>;
};
const contracts = {
  "./catalog/visibility": {
    types: "./src/public/catalogVisibility.d.ts",
    entry: "./src/catalog/visibility.ts",
    keys: ["buildCcAliasPredicate", "buildFunctionalGatewayPredicate", "getCcAliasSettingsBulk", "getFunctionalGatewaySettingsBulk", "isCcAliasGlobalEnabled", "isFunctionalGatewayGlobalEnabled"],
  },
  "./catalog/response-presentation": {
    types: "./src/public/catalogResponsePresentation.d.ts",
    entry: "./src/catalog/responsePresentation.ts",
    keys: ["createModelCapabilityResolutionSnapshot", "dedupeExactCatalogIds", "disambiguateCatalogModelNames", "enrichCatalogModelEntry", "getModelsCatalogPrefixMode", "isModelCatalogNamesEnabled", "maybeOmitCatalogModelName", "mergeCustomModelMetadata", "sortCatalogModelsProviderGrouped"],
  },
  "./auth/request-state": {
    types: "./src/public/authRequestState.d.ts",
    entry: "./src/auth/requestState.ts",
    keys: ["isAuthRequired", "isDashboardSessionAuthenticated"],
  },
  "./catalog/alias-backed-models": {
    types: "./dist/types/catalog/aliasBackedModels.d.ts",
    entry: "./src/catalog/aliasBackedModels.ts",
    keys: ["extractAliasBackedModels"],
  },
  "./catalog/synced-coverage": {
    types: "./dist/types/catalog/syncedCoverage.d.ts",
    entry: "./src/catalog/syncedCoverage.ts",
    keys: ["buildSyncedModelIdsByCanonicalProvider", "shouldSuppressStaticModelForExclusiveListing"],
  },
  "./catalog/model-listing-policy": {
    types: "./dist/types/catalog/modelListingPolicy.d.ts",
    entry: "./src/catalog/modelListingPolicy.ts",
    keys: ["providerUsesCuratedModelsOnly", "providerUsesExclusiveSyncedListing"],
  },
  "./catalog/cursor-auto-entry": {
    types: "./dist/types/catalog/cursorAutoEntry.d.ts",
    entry: "./src/catalog/cursorAutoEntry.ts",
    keys: ["ensureCursorAutoCatalogEntry"],
  },
  "./catalog/openrouter-catalog": {
    types: "./dist/types/catalog/openrouterCatalog.d.ts",
    entry: "./src/catalog/openrouterCatalog.ts",
    keys: ["getOpenRouterCatalog", "getOpenRouterDisplayName", "getOpenRouterModelType", "isOpenRouterFreeModel", "normalizeOpenRouterModalities", "qualifyOpenRouterModelId"],
  },
  "./catalog/diagnostics": {
    types: "./dist/types/catalog/diagnostics.d.ts",
    entry: "./src/catalog/diagnostics.ts",
    keys: ["INTERNAL_PROXY_ERROR", "getCatalogDiagnosticsHeaders"],
  },
  "./catalog/supported-endpoints": {
    types: "./dist/types/catalog/supportedEndpoints.d.ts",
    entry: "./src/catalog/supportedEndpoints.ts",
    keys: ["classifyModelSupportedEndpoints"],
  },
  "./catalog/provider-prefixes": {
    types: "./dist/types/catalog/providerPrefixes.d.ts",
    entry: "./src/catalog/providerPrefixes.ts",
    keys: ["isProviderNodePrefixReserved", "selectCompatibleNodeForPrefix"],
  },
  "./catalog/combo-capabilities": {
    types: "./dist/types/catalog/comboCapabilities.d.ts",
    entry: "./src/catalog/comboCapabilities.ts",
    keys: ["getConnectionScopedEffortTiers", "getThinkingCapabilityFields", "intersectStringArrays", "isPositiveFiniteNumber", "mergeComboCapabilities", "minKnownNumber", "parseJsonStringArray"],
  },
  "./catalog/vision-capabilities": {
    types: "./dist/types/catalog/visionCapabilities.d.ts",
    entry: "./src/catalog/visionCapabilities.ts",
    keys: ["getCustomVisionCapabilityFields", "getVisionCapabilityFields"],
  },
  "./catalog/codex-discovery-policy": {
    types: "./dist/types/catalog/codexDiscoveryPolicy.d.ts",
    entry: "./src/catalog/codexDiscoveryPolicy.ts",
    keys: ["isCodexDiscoveryModelExcluded"],
  },
  "./catalog/model-metadata": {
    types: "./src/public/catalogModelMetadata.d.ts",
    entry: "./src/catalog/modelMetadata.ts",
    keys: ["getCanonicalModelMetadata"],
  },
  "./catalog/managed-available-models": {
    types: "./src/public/catalogManagedModels.d.ts",
    entry: "./src/catalog/managedAvailableModels.ts",
    keys: ["getCompatibleFallbackModels"],
  },
} as const;

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? files(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("catalog runtime consumers use exact coherent contracts", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], { types: contract.types, import: contract.entry });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), subpath);
  }
});

test("catalog/runtime-support aggregate stays retired", () => {
  assert.equal(manifest.exports["./catalog/runtime-support"], undefined);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/catalog/runtime-support.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/catalogRuntimeSupport.d.ts")), false);
  for (const root of ["apps", "packages/inference"]) {
    for (const file of files(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), /core\/catalog\/runtime-support/, file);
    }
  }
});
