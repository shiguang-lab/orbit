import assert from "node:assert/strict";
import test from "node:test";

import { isCodexFreePlan } from "../src/executors/codex/tools.ts";
import { handleImageGeneration } from "../src/handlers/imageGeneration.ts";

test("isCodexFreePlan detects workspacePlanType === 'free' (case-insensitive)", () => {
  assert.equal(isCodexFreePlan({ workspacePlanType: "free" }), true);
  assert.equal(isCodexFreePlan({ workspacePlanType: "FREE" }), true);
  assert.equal(isCodexFreePlan({ workspacePlanType: "team" }), false);
  assert.equal(isCodexFreePlan({ workspacePlanType: "" }), false);
  assert.equal(isCodexFreePlan({}), false);
  assert.equal(isCodexFreePlan(null), false);
  assert.equal(isCodexFreePlan("free"), false);
});

// Imported accounts don't carry workspacePlanType — codexImport normalizes the
// JWT plan into providerSpecificData.chatgptPlanType instead. Without this
// fallback imported free-plan accounts would bypass the free-plan guard.
test("isCodexFreePlan falls back to chatgptPlanType for imported accounts", () => {
  assert.equal(isCodexFreePlan({ chatgptPlanType: "free" }), true);
  assert.equal(isCodexFreePlan({ chatgptPlanType: "FREE" }), true);
  assert.equal(isCodexFreePlan({ workspacePlanType: "team", chatgptPlanType: "free" }), false);
});

test("handleImageGeneration (codex) skips imported free-plan accounts and marks them retryable", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("free-plan image request should not reach upstream");
  }) as typeof fetch;

  try {
    const result = (await handleImageGeneration({
      body: { model: "codex/gpt-5.6-terra", prompt: "kitten" },
      credentials: {
        accessToken: "codex-token",
        providerSpecificData: { chatgptPlanType: "free" },
      },
      log: null,
    })) as { success: boolean; status: number; retryable?: boolean };
    assert.equal(result.success, false);
    assert.equal(result.status, 403);
    assert.equal(result.retryable, true);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
