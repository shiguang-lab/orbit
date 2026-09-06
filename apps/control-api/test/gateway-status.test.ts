import assert from "node:assert/strict";
import test from "node:test";

import { buildGatewayStatusSnapshot } from "../src/gateway/runtime/gateway-status.js";

test("gateway status summarizes providers, pools, quota, and circuits", () => {
  const status = buildGatewayStatusSnapshot({
    dbHealthy: true,
    connections: [
      { id: "active", provider: "openai", is_active: 1, test_status: "active", last_error: null },
      { id: "disabled", provider: "anthropic", is_active: 0, test_status: null, last_error: "failed" },
    ],
    pools: [{ id: "pool", name: "Primary", connectionIds: ["active"], allocations: [{ id: 1 }] }],
    quotaSummary: { active: 1 },
    circuitStatuses: [{ state: "OPEN" }, { state: "HALF_OPEN" }, { state: "CLOSED" }],
  });

  assert.equal(status.gateway, "healthy");
  assert.deepEqual(status.providers, {
    configured: 2,
    active: 1,
    healthy: 1,
    disabled: 1,
    connections: [
      { id: "active", provider: "openai", active: true, health: "healthy", failureState: "none" },
      { id: "disabled", provider: "anthropic", active: false, health: "disabled", failureState: "recent_error" },
    ],
  });
  assert.deepEqual(status.pools, {
    count: 1,
    allocations: 1,
    items: [{ id: "pool", name: "Primary", connectionIds: ["active"], allocationCount: 1 }],
  });
  assert.deepEqual(status.quotaMonitoring, {
    authoritative: 1,
    headerBased: 0,
    configured: 0,
    unsupported: 0,
    status: "partial",
  });
  assert.deepEqual(status.circuits, {
    open: 1,
    halfOpen: 1,
    closed: 1,
    source: "persisted circuit breaker registry",
  });
});

test("gateway status reports unavailable optional subsystems without inventing health", () => {
  const status = buildGatewayStatusSnapshot({
    dbHealthy: false,
    connections: [],
    pools: [],
    quotaSummary: null,
    circuitStatuses: null,
  });

  assert.equal(status.gateway, "degraded");
  assert.equal(status.quotaMonitoring.status, "unknown");
  assert.equal(status.quotaMonitoring.unsupported, null);
  assert.deepEqual(status.circuits, {
    status: "unknown",
    source: "resilience subsystem unavailable",
  });
});
