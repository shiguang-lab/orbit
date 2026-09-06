import type { ProviderPluginManifest, ProviderPluginManifestEntry } from "./providerPluginManifest.d.ts";

export function generateProviderPluginManifest(): ProviderPluginManifest;
export function getProviderPluginManifestEntry(provider: string): ProviderPluginManifestEntry | null;
export function getProviderPluginManifestEntryForModel(model: string | undefined): ProviderPluginManifestEntry | null;
