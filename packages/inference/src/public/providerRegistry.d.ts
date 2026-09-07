export interface RegistryModel {
  id: string;
  [key: string]: unknown;
}

export interface RegistryEntry {
  id: string;
  alias?: string;
  [key: string]: unknown;
}

export const REGISTRY: Record<string, RegistryEntry>;
export function getRegistryEntry(provider: string): RegistryEntry | null;
