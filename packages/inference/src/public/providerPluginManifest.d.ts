export type ProviderPluginCapability =
  | "apikey"
  | "custom-executor"
  | "oauth"
  | "passthrough-models"
  | "responses"
  | "sidecar-candidate";

export interface ProviderPluginModel {
  id: string;
  name: string;
  contextLength?: number;
  maxOutputTokens?: number;
  toolCalling?: boolean;
  supportsReasoning?: boolean;
  supportsVision?: boolean;
  supportsVideo?: boolean;
  unsupportedParams?: readonly string[];
  targetFormat?: string;
}

export interface ProviderPluginManifestEntry {
  id: string;
  alias?: string;
  format: string;
  executor: string;
  auth: { type: string; header: string; prefix?: string };
  endpoints: {
    baseUrl?: string;
    baseUrls?: string[];
    responsesBaseUrl?: string;
    chatPath?: string;
    modelsUrl?: string;
  };
  capabilities: ProviderPluginCapability[];
  passthroughModels: boolean;
  defaultContextLength?: number;
  timeoutMs?: number;
  models: ProviderPluginModel[];
  sidecar: { eligible: boolean; reasons: string[] };
}

export interface ProviderPluginManifest {
  schemaVersion: 1;
  generatedFrom: "open-sse/config/providers";
  providers: ProviderPluginManifestEntry[];
}

export function createProviderPluginManifestEntry(entry: unknown): ProviderPluginManifestEntry;
export function generateProviderPluginManifestFromRegistry(
  registry: Record<string, unknown>,
): ProviderPluginManifest;
export function createServiceBackendManifestEntry(
  pluginId: string,
  template: Pick<
    ProviderPluginManifestEntry,
    "format" | "executor" | "auth" | "endpoints" | "capabilities" | "passthroughModels" | "sidecar"
  >,
): ProviderPluginManifestEntry;
export function getProviderPluginManifestEntryFromRegistry(
  registry: Record<string, unknown>,
  provider: string,
): ProviderPluginManifestEntry | null;
