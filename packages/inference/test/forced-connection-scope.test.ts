import assert from "node:assert/strict";
import test from "node:test";

import {
  isForcedConnectionMissingFromPool,
  resolveForcedConnectionForCredentialPool,
} from "../src/services/sessionAffinityPin.ts";

const connection = (id: string, rateLimitedUntil: string | null = null) => ({
  id,
  rateLimitedUntil,
});

test("detects an unexcluded forced connection missing from the active pool", () => {
  assert.equal(
    isForcedConnectionMissingFromPool(
      "disabled-secondary",
      new Set(),
      [connection("healthy-primary")]
    ),
    true
  );
});

test("does not fail closed after the forced connection was intentionally excluded", () => {
  const excluded = new Set(["failed-primary"]);
  const connections = [connection("failed-primary"), connection("healthy-sibling")];

  assert.equal(
    isForcedConnectionMissingFromPool("failed-primary", excluded, connections),
    false
  );
  assert.equal(
    resolveForcedConnectionForCredentialPool({
      forcedConnectionId: "failed-primary",
      excludedConnectionIds: excluded,
      connections,
      allowRateLimitedConnections: false,
      bypassQuotaPolicy: false,
      isQuotaExhausted: () => false,
      isQuotaPolicyBlocked: () => false,
    }),
    null
  );
});

test("present, cooling, quota-blocked, and unforced connections are not missing", () => {
  assert.equal(
    isForcedConnectionMissingFromPool(
      "cooling",
      new Set(),
      [connection("cooling", "2099-01-01T00:00:00.000Z")]
    ),
    false
  );
  assert.equal(
    isForcedConnectionMissingFromPool("quota-blocked", new Set(), [connection("quota-blocked")]),
    false
  );
  assert.equal(isForcedConnectionMissingFromPool(null, new Set(), [connection("available")]), false);
});
