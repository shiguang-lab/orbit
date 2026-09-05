export function logAuditEvent(event: any): void;
export function getAuditRequestContext(request: Request): { ipAddress?: string | null; requestId?: string | null };
