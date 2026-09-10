import assert from "node:assert/strict";
import test from "node:test";
import {
  isExpiredReprobeCandidate,
  selectRecoverableConnections,
} from "../src/lib/quota/connectionRecovery.ts";

test("stale non-terminal expired connections are re-probed", () => {
  const now = Date.now();
  const stale = {
    id: "expired-race",
    testStatus: "expired",
    lastErrorType: "unauthorized",
    lastErrorAt: new Date(now - 31 * 60_000).toISOString(),
  };
  assert.equal(isExpiredReprobeCandidate(stale, now), true);
  assert.deepEqual(selectRecoverableConnections([stale], now), [stale]);
});

test("genuinely terminal expired connections stay blocked", () => {
  const now = Date.now();
  assert.equal(
    isExpiredReprobeCandidate(
      { id: "dead", testStatus: "expired", lastErrorType: "invalid_grant" },
      now
    ),
    false
  );
});
