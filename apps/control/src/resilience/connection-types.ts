export interface ResilienceConnectionsResponse {
  connections: ConnectionState[];
  breakers: BreakerWithHistory[];
  window: { sinceMs: number; untilMs: number; now: number };
  receivedAt?: number;
  meta: {
    totalConnections: number;
    coolingDownCount: number;
    unhealthyBreakerCount: number;
    countsCapped: boolean;
    degraded: string[];
  };
}

export interface ConnectionState {
  id: string;
  provider: string;
  name: string | null;
  authType: string;
  priority: number;
  isActive: boolean;
  connectionStatus: "healthy" | "cooling_down" | "circuit_open" | "terminal";
  rateLimitedUntil: string | null;
  backoffLevel: number;
  testStatus: string | null;
  lastErrorType: string | null;
  lastErrorAt: string | null;
  errorCode: string | null;
  lastUsedAt: string | null;
  cooldownRemainingMs: number;
  isCoolingDown: boolean;
  breaker: {
    state: string;
    failureCount: number;
    retryAfterMs: number;
    lastFailureKind: string | null;
  } | null;
  lockouts: Array<{ model: string; reason: string; remainingMs: number }>;
}

export interface BreakerWithHistory {
  name: string;
  state: string;
  failureCount: number;
  retryAfterMs: number;
  lastFailureKind: string | null;
  transitionHistory: Array<{
    from: string;
    to: string;
    timestamp: number;
    failureCount: number;
    reason?: string;
  }>;
}
