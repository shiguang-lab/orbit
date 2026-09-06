export type AuditLogEntry = Record<string, unknown> & {
  id?: number | null;
  action?: string | null;
  actor?: string | null;
  target?: string | null;
  status: string | null;
  timestamp: string;
  createdAt: string;
  details: unknown;
  metadata: unknown;
  ip_address: string | null;
  ip: string | null;
  resource_type: string | null;
  resourceType: string | null;
  request_id: string | null;
  requestId: string | null;
};

export interface AuditLogFilter {
  action?: string;
  actor?: string;
  target?: string;
  resourceType?: string;
  status?: string;
  requestId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  levelFilter?: "high";
}

export function getAuditRequestContext(request?: {
  headers?: Headers | { get?: (name: string) => string | null };
  socket?: { remoteAddress?: string };
  ip?: string;
}): { ipAddress: string | null; requestId: string };

export function logAuditEvent(entry: {
  action: string;
  actor?: string;
  target?: string;
  details?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  resourceType?: string;
  status?: string;
  requestId?: string;
  createdAt?: string;
}): void;

export function getAuditLog(filter?: AuditLogFilter): AuditLogEntry[];
export function countAuditLog(filter?: AuditLogFilter): number;
