import { Injectable } from "@nestjs/common";
import { countAuditLog, getAuditLog } from "@orbit/core/compliance/audit-log";

function page(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

@Injectable()
export class AuditLogService {
  get(query: Record<string, string | undefined>) {
    const level = query.level === "high" ? "high" : undefined;
    const filters = {
      action: query.action || undefined,
      actor: query.actor || undefined,
      target: query.target || undefined,
      resourceType: query.resourceType || query.resource_type || undefined,
      status: query.status || undefined,
      requestId: query.requestId || query.request_id || undefined,
      from: query.from || query.since || undefined,
      to: query.to || query.until || undefined,
      limit: page(query.limit, 50, 1, 500),
      offset: page(query.offset, 0, 0, 10_000),
      levelFilter: level as "high" | undefined,
    };
    const body = getAuditLog(filters);
    const total = countAuditLog(filters);
    return {
      body,
      headers: {
        "x-total-count": String(total),
        "x-page-limit": String(filters.limit),
        "x-page-offset": String(filters.offset),
      },
    };
  }
}
