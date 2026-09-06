import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";
import { pingDb } from "@shiguang-gateway/core-domain/db/ping";
import { listPools } from "@shiguang-gateway/core-domain/quota/db";

interface ProviderStatusRow {
  id: string;
  provider: string;
  is_active: number | boolean | null;
  test_status: string | null;
  last_error: string | null;
}

interface QuotaPoolStatus {
  id: string;
  name: string;
  connectionIds: string[];
  allocations: unknown[];
}

interface CircuitStatus {
  state: string;
}

function readProviderStatusRows(): ProviderStatusRow[] {
  const db = getDbInstance();
  return db
    .prepare<ProviderStatusRow>(
      "SELECT id, provider, is_active, test_status, last_error FROM provider_connections"
    )
    .all();
}

export async function buildShiguangGatewayStatus(
  getQuotaMonitorSummary: () => { active: number } | null,
) {
  const [connections, circuitModule] = await Promise.all([
    Promise.resolve(readProviderStatusRows()),
    import("@shiguang-gateway/core-domain/resilience/circuit-breaker").catch(() => null),
  ]);
  const pools = listPools().items;
  const circuitStatuses = circuitModule?.getAllCircuitBreakerStatuses() ?? null;
  const quotaSummary = getQuotaMonitorSummary();
  return buildGatewayStatusSnapshot({
    connections,
    pools,
    circuitStatuses,
    quotaSummary,
    dbHealthy: pingDb(),
  });
}

export function buildGatewayStatusSnapshot({
  connections,
  pools,
  circuitStatuses,
  quotaSummary,
  dbHealthy,
}: {
  connections: ProviderStatusRow[];
  pools: QuotaPoolStatus[];
  circuitStatuses: CircuitStatus[] | null;
  quotaSummary: { active: number } | null;
  dbHealthy: boolean;
}) {
  const active = connections.filter(
    (connection) => connection.is_active !== 0 && connection.is_active !== false
  );
  const disabled = connections.filter(
    (connection) => connection.is_active === 0 || connection.is_active === false
  );
  const healthy = active.filter((connection) => connection.test_status === "active");

  return {
    gateway: dbHealthy ? "healthy" : "degraded",
    catalog: { available: true },
    providers: {
      configured: connections.length,
      active: active.length,
      healthy: healthy.length,
      disabled: disabled.length,
      connections: connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        active: connection.is_active !== 0 && connection.is_active !== false,
        health:
          connection.is_active === 0 || connection.is_active === false
            ? "disabled"
            : connection.test_status === "active"
              ? "healthy"
              : "unknown",
        failureState: connection.last_error ? "recent_error" : "none",
      })),
    },
    pools: {
      count: pools.length,
      allocations: pools.reduce((count, pool) => count + pool.allocations.length, 0),
      items: pools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        connectionIds: pool.connectionIds,
        allocationCount: pool.allocations.length,
      })),
    },
    quotaMonitoring: {
      authoritative: quotaSummary?.active ?? 0,
      headerBased: 0,
      configured: 0,
      unsupported: quotaSummary ? Math.max(0, active.length - quotaSummary.active) : null,
      status: quotaSummary?.active ? "partial" : "unknown",
    },
    circuits: circuitStatuses
      ? {
          open: circuitStatuses.filter((c) => c.state === "OPEN").length,
          halfOpen: circuitStatuses.filter((c) => c.state === "HALF_OPEN").length,
          closed: circuitStatuses.filter((c) => c.state === "CLOSED").length,
          source: "persisted circuit breaker registry",
        }
      : { status: "unknown", source: "resilience subsystem unavailable" },
    usage: { source: "usage_history and call_logs", liveRequestsExecuted: false },
    budgets: { source: "internal governance limits", upstreamQuotaClaims: false },
  };
}
