import assert from "node:assert/strict";
import test from "node:test";
import {
  getPersistedConnectionCooldownSkipReason,
  hasFutureRateLimitUntil,
  isWithinUnavailableGrace,
} from "../src/services/combo/comboPredicates.js";

const TARGET = { modelStr: "openai/gpt-4o", connectionId: "conn-1" };

// #12168: an entire combo pool could answer ALL_TARGETS_SKIPPED with recordedAttempts === 0
// because getPersistedConnectionCooldownSkipReason() returned a skip for ANY row whose
// testStatus was `unavailable`, with no elapsed-cooldown check — and this gate runs BEFORE
// dispatch, so it prevented the very success that would clear the label. The skip is now
// bounded by the bare-label grace window (mirrors ERROR_LABEL_GRACE_MS in core's
// connectionRecovery.ts).

test("skips a RECENT unavailable connection that has no cooldown timestamp yet", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "unavailable",
    rateLimitedUntil: null,
    lastErrorAt: new Date().toISOString(),
  });
  assert.ok(reason);
  assert.match(reason!, /status=unavailable/);
});

test("does NOT skip a stale unavailable label once the grace window passed", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "unavailable",
    rateLimitedUntil: new Date(Date.now() - 60_000).toISOString(),
    lastErrorAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  });
  assert.equal(reason, null);
});

test("does NOT skip an unavailable row with no timestamps at all (orphan state)", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "unavailable",
    rateLimitedUntil: null,
    lastErrorAt: null,
  });
  assert.equal(reason, null);
});

test("still skips a future persisted cooldown regardless of testStatus", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "active",
    rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.ok(reason);
  assert.match(reason!, /persisted cooldown/);
});

test("still skips terminal quota-blocking statuses", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "banned",
    rateLimitedUntil: null,
  });
  assert.ok(reason);
  assert.match(reason!, /status=banned/);
});

test("does not skip an expired cooldown on an otherwise healthy connection", () => {
  const reason = getPersistedConnectionCooldownSkipReason(TARGET, {
    testStatus: "active",
    rateLimitedUntil: new Date(Date.now() - 60_000).toISOString(),
  });
  assert.equal(reason, null);
});

test("isWithinUnavailableGrace treats missing/unparseable timestamps as stale", () => {
  assert.equal(isWithinUnavailableGrace(new Date().toISOString()), true);
  assert.equal(isWithinUnavailableGrace(new Date(Date.now() - 5 * 60_000).toISOString()), false);
  assert.equal(isWithinUnavailableGrace(null), false);
  assert.equal(isWithinUnavailableGrace(""), false);
  assert.equal(isWithinUnavailableGrace("not-a-date"), false);
});

test("hasFutureRateLimitUntil ignores absent/unparseable values", () => {
  assert.equal(hasFutureRateLimitUntil(null), false);
  assert.equal(hasFutureRateLimitUntil(""), false);
  assert.equal(hasFutureRateLimitUntil("nope"), false);
  assert.equal(hasFutureRateLimitUntil(new Date(Date.now() + 60_000).toISOString()), true);
  assert.equal(hasFutureRateLimitUntil(new Date(Date.now() - 60_000).toISOString()), false);
});
