import type { ModelCatalogEntry, ModelProfile } from "./model-profile.js";

export interface SyncCodexProfilesOptions {
  codexHome?: string;
  dryRun?: boolean;
  only?: string;
}

export interface WrittenProfile {
  name: string;
  model: string;
  filePath: string;
}

export interface ProfileSyncResult {
  written: number;
  skipped: number;
  profiles: WrittenProfile[];
}

export function buildProfileToml(modelId: string, config: ModelProfile): string;
export function syncCodexProfilesFromModels(
  models: ModelCatalogEntry[],
  options?: SyncCodexProfilesOptions,
): Promise<ProfileSyncResult>;
