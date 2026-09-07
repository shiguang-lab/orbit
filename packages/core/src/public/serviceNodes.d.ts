export interface ServiceNode {
  id: string;
  scopeId: string;
  scopePrefix: string;
  name: string;
  endpoint: string;
  report: Record<string, unknown> | null;
  lastSeenAt: string | null;
  createdAt: string;
  online: boolean;
}
export function listServiceNodes(): ServiceNode[];
export function createServiceNode(input: {
  name: string;
  endpoint: string;
  id?: string;
}): { node: ServiceNode };
export function getServiceNodeConnection(
  id: string,
): { endpoint: string } | null;
export function acceptServiceNodeReport(
  id: string,
  report: Record<string, unknown>,
): boolean;
export function storeServiceNodeReport(
  id: string,
  report: Record<string, unknown>,
): void;
export function deleteServiceNode(id: string): boolean;
export function resolveCliproxyCredentialTarget(
  managerId: string,
  processId: string,
  credentialId: string,
): string;
