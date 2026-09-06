import type { ResilienceSettings } from "../lib/resilience/settings/types.js";

export interface ResilienceRuntimeSnapshot {
  revision: number;
  settings: ResilienceSettings;
}

export interface ResilienceRuntimeSettingsPort {
  applyRequestQueueSettings(settings: ResilienceSettings["requestQueue"]): void | Promise<void>;
  setProviderQuotaOverrides(
    settings: ResilienceSettings["providerQuotaOverrides"],
  ): void | Promise<void>;
  resetAllCircuitBreakers(): void | Promise<void>;
}

export interface ResilienceRuntimeRefreshResult {
  status: "applied" | "unchanged" | "stale";
  revision: number;
}

export function registerResilienceRuntimeSettingsPort(port: ResilienceRuntimeSettingsPort): void;
export function readResilienceRuntimeSnapshot(): Promise<ResilienceRuntimeSnapshot>;
export function persistResilienceSettings(
  settings: ResilienceSettings,
  options?: { expectedRevision?: number },
): Promise<ResilienceRuntimeSnapshot>;
export function refreshResilienceRuntimeSettings(options?: {
  minimumRevision?: number;
  force?: boolean;
  source?: string;
}): Promise<ResilienceRuntimeRefreshResult>;
