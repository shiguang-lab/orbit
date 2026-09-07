import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string }>;
};

const runtimeKeys = [
  "persistResilienceSettings",
  "readResilienceRuntimeSnapshot",
  "refreshResilienceRuntimeSettings",
  "registerResilienceRuntimeSettingsPort",
] as const;

test("resilience settings runtime is a physical narrow contract", async () => {
  const entry = manifest.exports["./resilience/settings-runtime"];
  assert.deepEqual(entry, {
    types: "./src/public/resilienceSettingsRuntime.d.ts",
    import: "./src/resilience/settingsRuntime.ts",
  });
  const runtime = await import(pathToFileURL(path.join(packageRoot, entry.import)).href);
  assert.deepEqual(Object.keys(runtime).sort(), [...runtimeKeys].sort());

  const declaration = fs.readFileSync(path.join(packageRoot, entry.types), "utf8");
  const declaredRuntimeKeys = [...declaration.matchAll(/export function (\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(declaredRuntimeKeys.sort(), [...runtimeKeys].sort());
});

test("persisted revisions gate runtime refresh and apply the complete resilience snapshot", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "resilience-runtime-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;

  const runtime = await import(
    `${pathToFileURL(path.join(packageRoot, "src/resilience/settingsRuntime.ts")).href}?runtime=${Date.now()}`
  );
  const settingsContract = await import("../src/resilience/settings.ts");
  const dbCore = await import("../src/lib/db/core.ts");
  t.after(() => {
    dbCore.resetDbInstance();
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const appliedQueues: unknown[] = [];
  const appliedOverrides: unknown[] = [];
  let breakerResets = 0;
  runtime.registerResilienceRuntimeSettingsPort({
    applyRequestQueueSettings(settings: unknown) {
      appliedQueues.push(settings);
    },
    setProviderQuotaOverrides(settings: unknown) {
      appliedOverrides.push(settings);
    },
    resetAllCircuitBreakers() {
      breakerResets += 1;
    },
  });

  const initial = await runtime.refreshResilienceRuntimeSettings({ force: true });
  assert.equal(initial.status, "applied");
  assert.equal(breakerResets, 0);

  const nextSettings = structuredClone(settingsContract.DEFAULT_RESILIENCE_SETTINGS);
  nextSettings.requestQueue.requestsPerMinute += 1;
  nextSettings.providerQuotaOverrides = { nvidia: { rpm: 17, concurrency: 2 } };
  nextSettings.connectionCooldown.oauth.useUpstream429BreakerHints = true;
  const persisted = await runtime.persistResilienceSettings(nextSettings, {
    expectedRevision: initial.revision,
  });
  assert.equal(persisted.revision, initial.revision + 1);
  assert.equal(persisted.settings.requestQueue.requestsPerMinute, nextSettings.requestQueue.requestsPerMinute);
  assert.deepEqual(persisted.settings.providerQuotaOverrides, nextSettings.providerQuotaOverrides);
  const { getSettings } = await import("../src/db/settings.ts");
  const stored = await getSettings();
  assert.deepEqual(stored.resilienceSettings, nextSettings);
  assert.equal(stored.requestRetry, nextSettings.waitForCooldown.maxRetries);
  assert.equal(stored.maxRetryIntervalSec, nextSettings.waitForCooldown.maxRetryWaitSec);

  const stale = await runtime.refreshResilienceRuntimeSettings({
    minimumRevision: persisted.revision + 1,
  });
  assert.deepEqual(stale, { status: "stale", revision: persisted.revision });
  assert.equal(appliedQueues.length, 1);

  const applied = await runtime.refreshResilienceRuntimeSettings({
    minimumRevision: persisted.revision,
  });
  assert.deepEqual(applied, { status: "applied", revision: persisted.revision });
  assert.equal(appliedQueues.length, 2);
  assert.deepEqual(appliedOverrides.at(-1), nextSettings.providerQuotaOverrides);
  assert.equal(breakerResets, 1);

  assert.deepEqual(await runtime.refreshResilienceRuntimeSettings(), {
    status: "unchanged",
    revision: persisted.revision,
  });
});
