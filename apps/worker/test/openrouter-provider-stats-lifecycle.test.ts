import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  initOpenRouterProviderStatsSync,
  stopOpenRouterProviderStatsSync,
} from "@shiguang-gateway/core-domain/worker/openrouter-provider-stats";
import { WORKER_JOBS } from "../src/jobs/registry.js";

test("worker registry wires provider stats shutdown to Nest teardown", () => {
  const job = WORKER_JOBS.find(({ name }) => name === "openrouter-provider-stats");
  assert.ok(job);
  const { loadModule, ...metadata } = job;
  assert.deepEqual(metadata, {
    name: "openrouter-provider-stats",
    mode: "call",
    exportName: "initOpenRouterProviderStatsSync",
    stopExportName: "stopOpenRouterProviderStatsSync",
  });
  assert.equal(typeof loadModule, "function");
});

test("provider stats scheduler supports idempotent start, stop, and restart", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "openrouter-provider-stats-"));
  const previousDataDir = process.env.DATA_DIR;
  const previousEnabled = process.env.OPENROUTER_PROVIDER_STATS_ENABLED;
  const previousTtl = process.env.OPENROUTER_PROVIDER_STATS_TTL_MS;
  process.env.DATA_DIR = dataDir;
  process.env.OPENROUTER_PROVIDER_STATS_ENABLED = "true";
  process.env.OPENROUTER_PROVIDER_STATS_TTL_MS = "1000";

  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  t.mock.timers.enable({ apis: ["setInterval"] });

  t.after(() => {
    stopOpenRouterProviderStatsSync();
    t.mock.timers.reset();
    fs.rmSync(dataDir, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    if (previousEnabled === undefined) delete process.env.OPENROUTER_PROVIDER_STATS_ENABLED;
    else process.env.OPENROUTER_PROVIDER_STATS_ENABLED = previousEnabled;
    if (previousTtl === undefined) delete process.env.OPENROUTER_PROVIDER_STATS_TTL_MS;
    else process.env.OPENROUTER_PROVIDER_STATS_TTL_MS = previousTtl;
  });

  assert.equal(initOpenRouterProviderStatsSync(), true);
  assert.equal(initOpenRouterProviderStatsSync(), true);
  assert.equal(fetchCount, 3, "double start must share one initial refresh and timer");
  await new Promise<void>((resolve) => setImmediate(resolve));

  t.mock.timers.tick(1000);
  assert.equal(fetchCount, 6, "the active timer refreshes once per interval");
  await new Promise<void>((resolve) => setImmediate(resolve));

  stopOpenRouterProviderStatsSync();
  stopOpenRouterProviderStatsSync();
  t.mock.timers.tick(5000);
  assert.equal(fetchCount, 6, "stopped scheduler leaves no active interval");

  assert.equal(initOpenRouterProviderStatsSync(), true);
  assert.equal(fetchCount, 9, "scheduler can restart after stop");
  await new Promise<void>((resolve) => setImmediate(resolve));
  t.mock.timers.tick(1000);
  assert.equal(fetchCount, 12, "restarted scheduler owns one interval");
  await new Promise<void>((resolve) => setImmediate(resolve));
});
