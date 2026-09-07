import assert from "node:assert/strict";
import test from "node:test";

import {
  getEligibleFreeOnboardingProviders,
  selectUnconfiguredFreeOnboardingProviders,
  setupFreeProviderConnections,
  withFreeProviderSetupLock,
} from "../src/providers/runtime/free-onboarding.js";

test("free onboarding exposes only eligible providers and removes configured providers", () => {
  const candidates = getEligibleFreeOnboardingProviders();
  assert.ok(candidates.length > 0);
  assert.deepEqual(candidates.map(({ id }) => id), [...candidates.map(({ id }) => id)].sort());
  assert.ok(candidates.every(({ id, name, caution }) => id && name && caution));

  assert.deepEqual(
    selectUnconfiguredFreeOnboardingProviders(candidates, [{ provider: candidates[0]!.id }]),
    candidates.slice(1),
  );
});

test("free onboarding deduplicates requests and reports created, configured, and failed providers", async () => {
  const candidates = [
    { id: "created", name: "Created", website: "", caution: "test", defaultModel: "model" },
    { id: "existing", name: "Existing", website: "", caution: "test" },
    { id: "failed", name: "Failed", website: "", caution: "test" },
  ];
  const createdInputs: unknown[] = [];
  const result = await setupFreeProviderConnections({
    requestedIds: ["created", "created", "existing", "failed"],
    candidates,
    listExisting: async () => [{ provider: "existing" }],
    create: async (input) => {
      createdInputs.push(input);
      return input.provider === "failed" ? null : { id: "connection" };
    },
  });

  assert.deepEqual(result.results, [
    { providerId: "created", status: "created", connectionId: "connection" },
    { providerId: "existing", status: "skipped", reason: "already-configured" },
    { providerId: "failed", status: "failed", reason: "Failed to create provider" },
  ]);
  assert.deepEqual(createdInputs, [
    {
      provider: "created",
      authType: "no-auth",
      name: "Created",
      isActive: true,
      testStatus: "unknown",
      defaultModel: "model",
    },
    {
      provider: "failed",
      authType: "no-auth",
      name: "Failed",
      isActive: true,
      testStatus: "unknown",
    },
  ]);
});

test("free onboarding rejects ineligible provider IDs before persistence", async () => {
  await assert.rejects(
    setupFreeProviderConnections({
      requestedIds: ["unknown"],
      candidates: [],
      listExisting: async () => [],
      create: async () => ({ id: "unexpected" }),
    }),
    /Ineligible free provider IDs: unknown/,
  );
});

test("free onboarding setup lock serializes concurrent mutations", async () => {
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const first = withFreeProviderSetupLock(async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
  });
  const second = withFreeProviderSetupLock(async () => {
    events.push("second:start");
    events.push("second:end");
  });

  await Promise.resolve();
  assert.deepEqual(events, ["first:start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first:start", "first:end", "second:start", "second:end"]);
});
