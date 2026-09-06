import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  detectExpirationFromResponse,
  getAllExpirations,
  getExpiration,
  getExpirationSummary,
  getExpiringSoon,
  removeExpiration,
  resetExpirations,
  setExpiration,
} from "../src/providers/provider-expiration.js";

const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
  resetExpirations();
});

test("keeps one module-level entry per connection and preserves defaults", () => {
  const entry = setExpiration("connection-1", "claude", "Primary", null, "oauth_token");
  assert.equal(entry.alertDays, 7);
  assert.equal(entry.note, null);
  assert.equal(entry.status, "unknown");
  assert.strictEqual(getExpiration("connection-1"), entry);

  const replacement = setExpiration(
    "connection-1",
    "claude",
    "Renewed",
    "2999-01-01T00:00:00.000Z",
    "subscription",
    { alertDays: 14, note: "renew annually" },
  );
  assert.strictEqual(getExpiration("connection-1"), replacement);
  assert.equal(getAllExpirations().length, 1);
  assert.equal(removeExpiration("connection-1"), true);
  assert.equal(removeExpiration("connection-1"), false);
  assert.equal(getExpiration("connection-1"), null);
});

test("sorts statuses and builds the summary with the nearest future expiration", () => {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  setExpiration("unknown", "p", "Unknown", "invalid", "api_credits");
  setExpiration("active", "p", "Active", "2999-01-01T00:00:00.000Z", "subscription");
  setExpiration("soon", "p", "Soon", soon, "oauth_token");
  setExpiration("expired", "p", "Expired", "2000-01-01T00:00:00.000Z", "oauth_token");

  assert.deepEqual(getAllExpirations().map((entry) => entry.status), [
    "expired",
    "expiring_soon",
    "active",
    "unknown",
  ]);
  assert.deepEqual(getExpiringSoon().map((entry) => entry.connectionId), ["expired", "soon"]);
  const summary = getExpirationSummary();
  assert.deepEqual({
    total: summary.total,
    active: summary.active,
    expiringSoon: summary.expiringSoon,
    expired: summary.expired,
    unknown: summary.unknown,
  }, { total: 4, active: 1, expiringSoon: 1, expired: 1, unknown: 1 });
  assert.equal(summary.nextExpiration?.connectionId, "soon");
});

test("detects token, subscription, epoch, and relative rate-limit expirations", () => {
  assert.equal(detectExpirationFromResponse("p", 401, {})?.expiryType, "oauth_token");
  assert.equal(detectExpirationFromResponse("p", 402, {})?.expiryType, "subscription");
  assert.deepEqual(detectExpirationFromResponse("p", 429, {
    "x-ratelimit-reset": "2000000000",
  }), {
    expiresAt: "2033-05-18T03:33:20.000Z",
    expiryType: "free_tier_reset",
  });

  Date.now = () => 1_000_000;
  assert.deepEqual(detectExpirationFromResponse("p", 429, { "retry-after": "60" }), {
    expiresAt: "1970-01-01T00:17:40.000Z",
    expiryType: "free_tier_reset",
  });
  assert.equal(detectExpirationFromResponse("p", 429, { "retry-after": "invalid" }), null);
  assert.equal(detectExpirationFromResponse("p", 200, {}), null);
});

test("reset clears the shared store and restores an empty summary", () => {
  setExpiration("connection-1", "p", "Primary", null, "oauth_token");
  resetExpirations();
  assert.deepEqual(getAllExpirations(), []);
  assert.deepEqual(getExpirationSummary(), {
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    unknown: 0,
    nextExpiration: null,
  });
});
