import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("effort permissions and output-only feature flag", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-effort-policy-"));
  process.env.DATA_DIR = dir;
  process.env.API_KEY_SECRET = "effort-policy-test-secret";
  const db = await import("../src/lib/db/core.ts");
  t.after(async () => {
    // Synced-catalog writes schedule a background context-window reconciliation.
    await new Promise((resolve) => setTimeout(resolve, 50));
    db.resetDbInstance(); rmSync(dir, { recursive: true, force: true });
  });
  const keys = await import("../src/lib/db/apiKeys.ts");
  const flags = await import("../src/shared/utils/featureFlags.ts");
  const key = await keys.createApiKey("effort-policy", "test");
  const base = "codex/gpt-5.6-sol";
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: [`${base}-high`] });
  assert.equal(await keys.isModelAllowedForKey(key.key, `${base}-high`), true);
  assert.equal(await keys.isModelAllowedForKey(key.key, "cx/gpt-5.6-sol", "high"), true);
  assert.equal(await keys.isModelAllowedForKey(key.key, base, "low"), false);
  assert.equal(await keys.isModelAllowedForKey(key.key, base), false);
  assert.equal(await keys.isModelAllowedForKey(key.key, `${base}-low`, "high"), false);
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "all", allowedModels: [], blockedModels: [`${base}-high`] });
  assert.equal(await keys.isModelAllowedForKey(key.key, base, "low"), true);
  assert.equal(await keys.isModelAllowedForKey(key.key, base, "high"), false);
  const models = await import("../src/lib/db/models.ts");
  await models.replaceSyncedAvailableModelsForConnection("openai", "test-connection", [
    { id: "upstream-model", name: "Base", supportedThinkingEfforts: ["low", "high"] },
    { id: "upstream-model-high", name: "Actual upstream model" },
  ]);
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: ["openai/upstream-model-high"], blockedModels: [] });
  assert.equal(await keys.isModelAllowedForKey(key.key, "openai/upstream-model-high"), true);
  assert.equal(await keys.isModelAllowedForKey(key.key, "openai/upstream-model", "high"), false);
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "all", allowedModels: [], blockedModels: [`${base}-high`] });
  assert.equal(await keys.isModelAllowedForKey(key.key, `${base}-high`), false);
  assert.equal(await keys.isModelAllowedForKey(key.key, base), false);
  assert.equal(flags.isFeatureFlagEnabled("HIDE_EFFORT_VARIANTS"), true);
  flags.setFeatureFlagOverride("HIDE_EFFORT_VARIANTS", "false");
  assert.equal(flags.isFeatureFlagEnabled("HIDE_EFFORT_VARIANTS"), false);
  assert.equal(await keys.isModelAllowedForKey(key.key, base, "high"), false);
  flags.setFeatureFlagOverride("HIDE_EFFORT_VARIANTS", "true");
  assert.equal(flags.isFeatureFlagEnabled("HIDE_EFFORT_VARIANTS"), true);
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: [base], blockedModels: [] });
  assert.equal(await keys.isModelAllowedForKey(key.key, `${base}-high`), true);
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: [], blockedModels: [] });
  assert.equal(await keys.isModelAllowedForKey(key.key, base, "high"), false);
});
