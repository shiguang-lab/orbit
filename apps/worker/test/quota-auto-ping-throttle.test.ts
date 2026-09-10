import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createQuotaAutoPingState,
  runQuotaAutoPingTick,
  type QuotaAutoPingDeps,
} from "../src/jobs/quota-auto-ping.js";

const NOW_MS = Date.parse("2026-09-01T00:00:00.000Z");

function baseDeps(overrides: Partial<QuotaAutoPingDeps> = {}): QuotaAutoPingDeps {
  return {
    getSettings: async () => ({
      codexAutoPing: { connections: { "codex-1": true } },
    }),
    getProviderConnections: async () => [
      { id: "codex-1", provider: "codex", authType: "oauth", accessToken: "t1" },
    ],
    updateProviderConnection: async () => undefined,
    refreshAndUpdateCredentials: async (connection) => ({ connection }),
    getCodexUsage: async () => ({ quotas: {} }),
    throttleQuotaFetch: async () => undefined,
    getExecutor: async () => ({ execute: async () => ({}) }) as never,
    canExecuteProvider: () => true,
    isConnectionUnavailableToAuxiliaryActivity: async () => false,
    resolvePingModel: async () => "gpt-5.3-codex",
    ...overrides,
  };
}

test("routes the auto-ping usage read through the shared quota-fetch throttle (#11904)", async () => {
  // #11904: every other Codex quota read goes through `throttleQuotaFetch()` — the
  // #6009/#6058 gate that spaces genuine upstream calls so many accounts on one IP do
  // not fire in the same second, which is the pattern that got a Codex OAuth token
  // revoked. The auto-ping scheduler called `getCodexUsage` directly, so the one Codex
  // path that runs unattended every 60s per connection was the one skipping the
  // mitigation written for Codex.
  const order: string[] = [];
  const deps = baseDeps({
    getSettings: async () => ({
      codexAutoPing: { connections: { "codex-1": true, "codex-2": true } },
    }),
    getProviderConnections: async ({ provider }) =>
      provider === "codex"
        ? [
            { id: "codex-1", provider: "codex", authType: "oauth", accessToken: "t1" },
            { id: "codex-2", provider: "codex", authType: "oauth", accessToken: "t2" },
          ]
        : [],
    throttleQuotaFetch: async () => {
      order.push("throttle");
    },
    getCodexUsage: async () => {
      order.push("fetch");
      return { quotas: {} };
    },
  });

  await runQuotaAutoPingTick(deps, createQuotaAutoPingState(), () => NOW_MS);

  // Two connections, so two gated fetches, and the gate must precede each one.
  assert.deepEqual(order, ["throttle", "fetch", "throttle", "fetch"]);
});

test("does not consume a throttle slot when the connection is skipped before fetching (#11904)", async () => {
  // The throttle paces genuine upstream calls only. A connection filtered out by the
  // circuit breaker never reaches the network, so it must not take a slot and delay
  // the connections that do.
  const order: string[] = [];
  const deps = baseDeps({
    canExecuteProvider: () => false,
    throttleQuotaFetch: async () => {
      order.push("throttle");
    },
    getCodexUsage: async () => {
      order.push("fetch");
      return { quotas: {} };
    },
  });

  await runQuotaAutoPingTick(deps, createQuotaAutoPingState(), () => NOW_MS);

  assert.deepEqual(order, []);
});

test("does not consume a throttle slot when the credential refresh fails before fetching (#11904)", async () => {
  // The gate sits after every skip check, including the credential-refresh failure
  // path. A connection whose refresh throws never reaches the network.
  const order: string[] = [];
  const deps = baseDeps({
    refreshAndUpdateCredentials: async () => {
      throw new Error("refresh failed");
    },
    throttleQuotaFetch: async () => {
      order.push("throttle");
    },
    getCodexUsage: async () => {
      order.push("fetch");
      return { quotas: {} };
    },
  });

  await runQuotaAutoPingTick(deps, createQuotaAutoPingState(), () => NOW_MS);

  assert.deepEqual(order, []);
});
