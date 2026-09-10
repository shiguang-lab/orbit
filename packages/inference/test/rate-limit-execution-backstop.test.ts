import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  resolveExecutionMaxWaitMs,
  resolveRequestQueueMaxWaitMs,
} from "../src/services/rateLimitManager.ts";

/**
 * #12027 — Bottleneck's `expiration` only starts once a job leaves QUEUED, so it
 * bounds limiter-managed execution, never queue wait. Feeding it the queue-wait
 * budget killed legitimate long-running executions on non-incremental gateways
 * (which buffer a whole generation before first bytes) with false 504s.
 */

test("the execution backstop is decoupled from the queue-wait budget", () => {
  const execution = resolveExecutionMaxWaitMs();
  const queueWait = resolveRequestQueueMaxWaitMs("opencode-go");

  assert.equal(execution, 600_000, "default execution backstop is 10 minutes");
  assert.equal(queueWait, 15_000, "default queue-wait budget is unchanged");
  assert.notEqual(
    execution,
    queueWait,
    "the execution backstop must not equal the queue-wait budget"
  );
  assert.ok(execution > queueWait, "the backstop must outlive the queue-wait deadline");
});

test("withRateLimit feeds `expiration` from the execution backstop, not the queue budget", () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, "../src/services/rateLimitManager.ts"),
    "utf8"
  );

  assert.match(
    source,
    /const executionExpirationMs = resolveExecutionMaxWaitMs\(\);/,
    "the limiter expiration must come from the dedicated execution setting"
  );
  assert.doesNotMatch(
    source,
    /const executionExpirationMs = maxWaitMs;/,
    "the queue-wait budget must no longer drive the limiter expiration"
  );
  assert.match(
    source,
    /resilienceSettings\.requestQueue\.executionMaxWaitMs=\$\{executionExpirationMs\}ms/,
    "the local rate-limit error must name the setting that actually fired"
  );
});
