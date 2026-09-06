import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createModelSyncScheduler,
  resolveModelSyncIntervalMs,
} from "../src/jobs/model-sync-scheduler.js";

type FakeTimer = ReturnType<typeof setTimeout> & {
  callback: () => void;
  delayMs: number;
  kind: "timeout" | "interval";
};

function fakeTimer(callback: () => void, delayMs: number, kind: FakeTimer["kind"]): FakeTimer {
  return {
    callback,
    delayMs,
    kind,
    unref() {
      return this;
    },
  } as FakeTimer;
}

test("normalizes the model-sync interval override", () => {
  assert.equal(resolveModelSyncIntervalMs("2", 123), 7_200_000);
  assert.equal(resolveModelSyncIntervalMs("0", 123), 123);
  assert.equal(resolveModelSyncIntervalMs("invalid", 123), 123);
});

test("worker scheduler owns one startup timer and one recurring timer", async () => {
  const created: FakeTimer[] = [];
  const cleared: FakeTimer[] = [];
  const runs: string[] = [];
  const scheduler = createModelSyncScheduler({
    runCycle: async (baseUrl) => {
      runs.push(baseUrl);
    },
    revalidateCodexCatalogs: async (baseUrl) => {
      runs.push(`revalidate:${baseUrl}`);
    },
    setTimeout: (callback, delayMs) => {
      const timer = fakeTimer(callback, delayMs, "timeout");
      created.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      cleared.push(timer as FakeTimer);
    },
    setInterval: (callback, delayMs) => {
      const timer = fakeTimer(callback, delayMs, "interval");
      created.push(timer);
      return timer;
    },
    clearInterval: (timer) => {
      cleared.push(timer as FakeTimer);
    },
    intervalHours: undefined,
    log: () => undefined,
  });

  scheduler.start("http://127.0.0.1:20128", 60_000);
  scheduler.start("http://127.0.0.1:20128", 60_000);
  await Promise.resolve();

  assert.deepEqual(
    created.map(({ delayMs, kind }) => ({ delayMs, kind })),
    [
      { delayMs: 5_000, kind: "timeout" },
      { delayMs: 60_000, kind: "interval" },
    ]
  );
  assert.deepEqual(runs, ["revalidate:http://127.0.0.1:20128"]);

  created[0].callback();
  created[1].callback();
  await Promise.resolve();
  assert.deepEqual(runs, [
    "revalidate:http://127.0.0.1:20128",
    "http://127.0.0.1:20128",
    "http://127.0.0.1:20128",
  ]);

  scheduler.stop();
  assert.deepEqual(cleared, [created[1]]);
});

test("worker scheduler cancels a pending startup cycle on stop", () => {
  const created: FakeTimer[] = [];
  const cleared: FakeTimer[] = [];
  const scheduler = createModelSyncScheduler({
    runCycle: async () => undefined,
    revalidateCodexCatalogs: async () => undefined,
    setTimeout: (callback, delayMs) => {
      const timer = fakeTimer(callback, delayMs, "timeout");
      created.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      cleared.push(timer as FakeTimer);
    },
    setInterval: (callback, delayMs) => {
      const timer = fakeTimer(callback, delayMs, "interval");
      created.push(timer);
      return timer;
    },
    clearInterval: (timer) => {
      cleared.push(timer as FakeTimer);
    },
    intervalHours: undefined,
    log: () => undefined,
  });

  scheduler.start("http://127.0.0.1:20128", 60_000);
  scheduler.stop();
  assert.deepEqual(cleared, created);
});
