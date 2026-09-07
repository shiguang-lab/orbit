import { sanitizeErrorMessage } from "@orbit/utils/errors";
import {
  getAllCustomModels,
  getAllSyncedAvailableModels,
  getSyncedAvailableModels,
} from "@orbit/core/db/models";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { getResolvedModelCapabilities } from "@orbit/core/catalog/model-capabilities";
import { getSyncedCapabilities } from "@orbit/core/catalog/synced-model-capabilities";
import {
  PROVIDER_MODELS,
  PROVIDER_ID_TO_ALIAS,
} from "@orbit/core/catalog/provider-models";
import { mergeCustomModelMetadata } from "@orbit/core/catalog/response-presentation";
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
