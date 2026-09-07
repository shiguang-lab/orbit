import type { ModelCatalogEntry, ModelProfile } from "./model-profile.js";
import type { ProfileSyncResult } from "./codex.js";

export interface SyncClaudeProfilesOptions {
  claudeHome?: string;
  baseUrl: string;
  dryRun?: boolean;
  only?: string;
  log?: (line: string) => void;
}

export function fallbackClaudeProfile(
  modelId: string,
  model: ModelCatalogEntry,
): Pick<ModelProfile, "name"> | null;
export function buildProfileSettings(
  modelId: string,
  baseUrl: string,
  config: ModelProfile | Pick<ModelProfile, "name">,
): string;
export function syncClaudeProfilesFromModels(
  models: ModelCatalogEntry[],
  options: SyncClaudeProfilesOptions,
): Promise<ProfileSyncResult>;
