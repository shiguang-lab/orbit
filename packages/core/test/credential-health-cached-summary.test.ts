import assert from "node:assert/strict";
import test from "node:test";

import {
  getCachedCredentialHealthSummary,
  getCredentialHealthSummary,
  setCredentialHealth,
} from "../src/lib/credentialHealth/cache.ts";
import type { CredentialCacheEntry } from "../src/lib/credentialHealth/cache.ts";

type CacheState = { initialized: boolean; cache: Map<string, CredentialCacheEntry> };

function resetCache(): CacheState {
  const state: CacheState = { initialized: false, cache: new Map() };
  (globalThis as Record<string, unknown>).__orbitCredentialCache = state;
  return state;
}

test("getCachedCredentialHealthSummary counts expired rows instead of dropping them", () => {
  const state = resetCache();
  state.cache.set("conn-1", {
    status: {
      connectionId: "conn-1",
      provider: "openai",
      status: "active",
      lastTested: new Date(),
      consecutiveFailures: 0,
    },
    expiresAt: Date.now() + 60_000,
  });
  // Expired but not yet refreshed by the background scheduler: must stay in
  // the counts so a monitoring scrape returns immediately (#12532).
  state.cache.set("conn-2", {
    status: {
      connectionId: "conn-2",
      provider: "openai",
      status: "error",
      lastTested: new Date(),
      consecutiveFailures: 2,
    },
    expiresAt: Date.now() - 60_000,
  });

  const summary = getCachedCredentialHealthSummary();
  assert.equal(summary.total, 2);
  assert.equal(summary.healthy, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.stale, 1); // only the expired row
  assert.equal(summary.unknown, 0);
});

test("getCredentialHealthSummary delegates to the stale-safe cached snapshot", () => {
  resetCache();
  setCredentialHealth("conn-3", "openai", "active");
  const summary = getCredentialHealthSummary();
  assert.equal(summary.total, 1);
  assert.equal(summary.healthy, 1);
});

test("stale counting uses the STALE_THRESHOLD (10 min) over lastTested", () => {
  const state = resetCache();
  state.cache.set("conn-4", {
    status: {
      connectionId: "conn-4",
      provider: "openai",
      status: "active",
      lastTested: new Date(Date.now() - 11 * 60_000),
      consecutiveFailures: 0,
    },
    expiresAt: Date.now() + 60_000,
  });
  const summary = getCachedCredentialHealthSummary();
  assert.equal(summary.total, 1);
  assert.equal(summary.stale, 1);
});
