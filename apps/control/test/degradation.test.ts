import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getDegradationReport,
  getDegradationSummary,
  getFeatureStatus,
  hasAnyDegradation,
  resetDegradationRegistry,
  withDegradation,
  withDegradationSync,
} from "../src/health/degradation.js";

afterEach(() => {
  resetDegradationRegistry();
});

test("records full results in the shared module registry", async () => {
  const first = await withDegradation("search", () => "primary", () => "fallback", "default");

  assert.equal(first.result, "primary");
  assert.equal(first.status.level, "full");
  assert.strictEqual(getFeatureStatus("search"), first.status);
  assert.equal(hasAnyDegradation(), false);
  assert.deepEqual(getDegradationSummary(), {
    full: 1,
    reduced: 0,
    minimal: 0,
    default: 0,
  });
});

test("uses fallback, reports the primary error, and preserves since at the same level", async () => {
  const notifications: string[] = [];
  const first = await withDegradation(
    "rate-limit",
    () => { throw new Error("redis unavailable"); },
    () => "memory",
    "allow",
    {
      reducedCapability: "Single process",
      onDegrade: (status) => notifications.push(status.level),
    },
  );
  const second = await withDegradation(
    "rate-limit",
    () => { throw new Error("still unavailable"); },
    () => "memory-again",
    "allow",
  );

  assert.equal(first.result, "memory");
  assert.equal(first.status.capability, "Single process");
  assert.equal(first.status.reason, "redis unavailable");
  assert.equal(second.status.since, first.status.since);
  assert.deepEqual(notifications, ["reduced"]);
  assert.equal(hasAnyDegradation(), true);
});

test("returns the safe default when both asynchronous operations fail", async () => {
  const outcome = await withDegradation(
    "semantic-search",
    () => Promise.reject(new Error("primary failed")),
    () => Promise.reject("fallback failed"),
    [] as string[],
  );

  assert.deepEqual(outcome.result, []);
  assert.equal(outcome.status.level, "default");
  assert.equal(outcome.status.reason, "primary failed → fallback failed");
});

test("preserves synchronous fallback and default behavior", () => {
  const reduced = withDegradationSync(
    "sync-reduced",
    () => { throw new Error("primary"); },
    () => 2,
    3,
  );
  const safeDefault = withDegradationSync(
    "sync-default",
    () => { throw new Error("primary"); },
    () => { throw new Error("fallback"); },
    3,
  );

  assert.equal(reduced.result, 2);
  assert.equal(reduced.status.level, "reduced");
  assert.equal(safeDefault.result, 3);
  assert.equal(safeDefault.status.level, "default");
  assert.match(safeDefault.status.reason, /primary.*fallback/);
  assert.deepEqual(getDegradationReport().map((status) => status.level), ["default", "reduced"]);
});

test("reset clears all singleton registry state", () => {
  withDegradationSync("tracked", () => true, () => false, false);
  resetDegradationRegistry();

  assert.equal(getFeatureStatus("tracked"), null);
  assert.deepEqual(getDegradationReport(), []);
  assert.equal(hasAnyDegradation(), false);
});
