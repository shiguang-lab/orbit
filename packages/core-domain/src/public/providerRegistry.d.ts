export interface RegistryModel {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface RegistryEntry {
  id: string;
  alias?: string;
  name?: string;
  authType?: string;
  format?: string;
  models?: RegistryModel[];
  [key: string]: unknown;
}

export const REGISTRY: Record<string, RegistryEntry>;
