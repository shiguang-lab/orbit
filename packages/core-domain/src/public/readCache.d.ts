export function getCachedSettings(): Promise<Record<string, unknown>>;
export function getCachedProviderConnections(
  filter?: Record<string, unknown>,
): Promise<unknown[]>;
export function getCachedRawProviderConnections(
  filter?: Record<string, unknown>,
): Promise<unknown[]>;
export function getCachedProviderConnectionById(
  id: string,
): Promise<Record<string, unknown> | null>;
export function getCachedProviderNodes(
  filter?: Record<string, unknown>,
): Promise<Array<Record<string, unknown> | null>>;
export function getCombosCacheVersion(): number;
