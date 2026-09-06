export interface ProxyRegistryRecord {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  region: string | null;
  notes: string | null;
  status: string;
  source: string;
  family: string;
  subscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedProxy {
  type: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
}

export function resolveProxyForProvider(providerId: string): Promise<ResolvedProxy | null>;
export function hasBlockingProxyAssignmentForProvider(providerId: string): boolean;
export function hasBlockingProxyAssignment(connectionId: string, providerId?: string): boolean;
export function getProxyById(
  id: string,
  options?: { includeSecrets?: boolean },
): Promise<ProxyRegistryRecord | null>;
