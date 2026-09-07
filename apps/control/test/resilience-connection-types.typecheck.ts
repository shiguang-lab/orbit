import type {
  BreakerWithHistory,
  ConnectionState,
  ResilienceConnectionsResponse,
} from "../src/resilience/connection-types.js";

const breaker = {
  name: "openai",
  state: "OPEN",
  failureCount: 2,
  retryAfterMs: 1_000,
  lastFailureKind: "rate_limit",
  transitionHistory: [
    { from: "CLOSED", to: "OPEN", timestamp: 1, failureCount: 2, reason: "429" },
  ],
} satisfies BreakerWithHistory;

const connection = {
  id: "connection-1",
  provider: "openai",
  name: "Primary",
  authType: "api_key",
  priority: 0,
  isActive: true,
  connectionStatus: "circuit_open",
  rateLimitedUntil: null,
  backoffLevel: 1,
  testStatus: null,
  lastErrorType: "rate_limit",
  lastErrorAt: null,
  errorCode: "rate_limit",
  lastUsedAt: null,
  cooldownRemainingMs: 1_000,
  isCoolingDown: true,
  breaker: {
    state: breaker.state,
    failureCount: breaker.failureCount,
    retryAfterMs: breaker.retryAfterMs,
    lastFailureKind: breaker.lastFailureKind,
  },
  lockouts: [{ model: "gpt-5", reason: "quota", remainingMs: 1_000 }],
} satisfies ConnectionState;

const response = {
  connections: [connection],
  breakers: [breaker],
  window: { sinceMs: 0, untilMs: 1, now: 1 },
  meta: {
    totalConnections: 1,
    coolingDownCount: 1,
    unhealthyBreakerCount: 1,
    countsCapped: false,
    degraded: [],
  },
} satisfies ResilienceConnectionsResponse;

void response;
