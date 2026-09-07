export const EGRESS_IP_LOOKUP_WINDOW_MS: number;
export function exportProxyLogsSince(since: string): Record<string, unknown>[];
export function getRecentEgressIpForConnection(
  connectionId: string,
  since: string,
): { egressIp: string; at: string } | null;
