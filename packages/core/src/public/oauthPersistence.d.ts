export function createProviderConnection(data: Record<string, unknown>): Promise<Record<string, unknown>>;
export function getCachedProviderConnectionById(id: string): Promise<Record<string, unknown> | null>;
export function getProviderConnections(filter?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
export function updateProviderConnection(
  id: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown> | null>;
export function pickCodexConnectionForUser(
  candidates: Array<Record<string, unknown>>,
  userId?: string | null,
  email?: string | null
): Record<string, unknown> | null;
