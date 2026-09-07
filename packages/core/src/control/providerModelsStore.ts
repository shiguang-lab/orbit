/**
 * Provider-model persistence contract used by control.
 *
 * The HTTP handlers live in the control app. This module intentionally exposes
 * only the storage operations that cross the app/package boundary; route
 * orchestration and response shaping must stay app-owned.
 */
export {
  getCustomModels,
  getAllCustomModels,
  addCustomModel,
  removeCustomModel,
  replaceCustomModels,
  deleteSyncedAvailableModelsForProvider,
  removeSyncedAvailableModel,
  updateCustomModel,
  getModelCompatOverrides,
  mergeModelCompatOverride,
  getHiddenModelsByProvider,
} from "../lib/db/models.ts";
export type { ModelCompatPatch } from "../lib/db/models.ts";
