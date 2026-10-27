import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("catalog allowlists match full public model IDs", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-catalog-allowlist-"));
  process.env.DATA_DIR = dir;
  process.env.API_KEY_SECRET = "catalog-allowlist-test-secret";
  const db = await import("../../core/src/lib/db/core.ts");
  t.after(() => {
    db.resetDbInstance();
    rmSync(dir, { recursive: true, force: true });
  });
  const keys = await import("@orbit/core/db/api-keys");
  const { finalizeCatalogResponse } = await import("../src/catalog/catalogResponse.ts");
  const key = await keys.createApiKey("catalog-allowlist", "test");
  const selected = ["gemini-3.8-flash", "gemini-3.7-flash", "claude-opus", "claude-sonnet"];
  const entry = (id: string) => ({ id, object: "model", owned_by: "combo", root: id });
  const candidates = [
    ...selected.map(entry),
    entry("auto/claude-opus"),
    entry("auto/claude-sonnet"),
    entry("claude-opus-extra"),
    { id: "claude/claude-opus", owned_by: "claude", root: "claude-opus" },
  ];

  async function listed(models: Array<Record<string, unknown>> = candidates) {
    const request = new Request("http://localhost/v1/models", {
      headers: { Authorization: `Bearer ${key.key}` },
    });
    const response = await finalizeCatalogResponse(request, models, () => undefined, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.data.map((model: { id: string }) => model.id).sort();
  }

  await t.test("four selected IDs do not advertise auto routes or provider mirrors", async () => {
    await keys.updateApiKeyPermissions(key.id, {
      modelAccessMode: "restricted", allowedModels: selected,
    });
    assert.deepEqual(await listed(), [...selected].sort());
  });

  await t.test("prefix matching stays disabled when the bare entry is absent", async () => {
    assert.deepEqual(await listed(candidates.filter((model) => !selected.includes(model.id))), []);
  });

  await t.test("an explicitly selected auto route is listed by its full ID", async () => {
    await keys.updateApiKeyPermissions(key.id, {
      modelAccessMode: "restricted", allowedModels: ["auto/claude-opus"],
    });
    assert.deepEqual(await listed(), ["auto/claude-opus"]);
  });

  await t.test("explicit wildcard patterns match full IDs", async () => {
    await keys.updateApiKeyPermissions(key.id, {
      modelAccessMode: "restricted", allowedModels: ["auto/*"],
    });
    assert.deepEqual(await listed(), ["auto/claude-opus", "auto/claude-sonnet"]);
  });

  await t.test("block rules still override an explicit catalog match", async () => {
    await keys.updateApiKeyPermissions(key.id, {
      modelAccessMode: "restricted", allowedModels: ["auto/*"], blockedModels: ["auto/claude-opus"],
    });
    assert.deepEqual(await listed(), ["auto/claude-sonnet"]);
  });

  await t.test("declared effort variants retain base authorization", async () => {
    await keys.updateApiKeyPermissions(key.id, {
      modelAccessMode: "restricted", allowedModels: ["claude-opus"], blockedModels: [],
    });
    assert.deepEqual(await listed([
      entry("claude-opus"),
      { ...entry("claude-opus-high"), effort_variant: { base_model: "claude-opus", effort: "high" } },
      entry("auto/claude-opus"),
    ]), ["claude-opus", "claude-opus-high"]);
  });

  await t.test("an empty restricted allowlist lists no models", async () => {
    await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: [] });
    assert.deepEqual(await listed(), []);
  });

  await t.test("unrestricted keys keep auto and bare combo entries", async () => {
    await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "all", allowedModels: [] });
    const combos = candidates.filter((model) => model.owned_by === "combo");
    assert.deepEqual(await listed(combos), combos.map((model) => model.id).sort());
  });
});
