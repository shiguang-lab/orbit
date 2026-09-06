import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import {
  getAllCustomModels,
  getAllSyncedAvailableModels,
  getSyncedAvailableModels,
} from "@shiguang-gateway/core-domain/db/models";
import { getProviderConnections } from "@shiguang-gateway/core-domain/db/provider-connections";
import { getResolvedModelCapabilities } from "@shiguang-gateway/core-domain/catalog/model-capabilities";
import { getSyncedCapabilities } from "@shiguang-gateway/core-domain/catalog/synced-model-capabilities";
import {
  PROVIDER_MODELS,
  PROVIDER_ID_TO_ALIAS,
  mergeCustomModelMetadata,
} from "@shiguang-gateway/core-domain/catalog/runtime-support";
import {
  GET as getModels,
  OPTIONS,
  type V1BetaModelsDependencies,
} from "./v1beta-models-logic.js";

const dependencies: V1BetaModelsDependencies = {
  providerModels: PROVIDER_MODELS,
  providerIdToAlias: PROVIDER_ID_TO_ALIAS,
  getProviderConnections,
  getAllCustomModels,
  getAllSyncedAvailableModels,
  getSyncedAvailableModels: getSyncedAvailableModels as unknown as V1BetaModelsDependencies["getSyncedAvailableModels"],
  getResolvedModelCapabilities,
  getSyncedCapabilities,
  mergeCustomModelMetadata,
  sanitizeErrorMessage,
};

export { OPTIONS };

export function GET(): Promise<Response> {
  return getModels(dependencies);
}
