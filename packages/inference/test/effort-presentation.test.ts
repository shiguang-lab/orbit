import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregateEffortVariants } from "../src/catalog/effortPresentation.ts";
import { appendSyncedEffortVariants } from "../src/utils/syncedEffortVariants.ts";

test("aggregate only Orbit provenance, including partially authorized families", () => {
  const base = { id: "vendor/model", root: "model", owned_by: "vendor", capabilities: { effort_tiers: ["low", "high"] } };
  const upstream = { id: "vendor/model-high", root: "model-high", owned_by: "vendor" };
  const full = appendSyncedEffortVariants([base, upstream]);
  assert.deepEqual(full.map((m) => m.id), [base.id, upstream.id, "vendor/model-low"]);
  const projected = aggregateEffortVariants(full);
  assert.deepEqual(projected.map((m) => m.id), [base.id, upstream.id]);
  assert.equal(full.length, 3, "projection does not modify internal data");
  const partial = aggregateEffortVariants(full.filter((m) => m.id === "vendor/model-low"));
  assert.equal(partial[0].id, base.id);
  assert.equal(partial[0].root, base.root);
  assert.deepEqual(partial[0].capabilities.effort_tiers, ["low"]);
  assert.equal(partial[0].effort_variant, undefined);
  assert.deepEqual(aggregateEffortVariants([]), []);
});

test("public catalog defaults to collapsed and supports request-level expansion", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-effort-catalog-"));
  process.env.DATA_DIR = dir;
  process.env.API_KEY_SECRET = "effort-catalog-test-secret";
  const db = await import("@orbit/core/db/connection");
  t.after(() => { db.resetDbInstance(); rmSync(dir, { recursive: true, force: true }); });
  const { createProviderConnection } = await import("@orbit/core/db/provider-connections");
  await createProviderConnection({ provider: "codex", name: "test", authType: "oauth", isActive: true, accessToken: "test-only" });
  const keys = await import("@orbit/core/db/api-keys");
  const { installCoreDomainRuntimePorts } = await import("../src/services/coreDomainRuntimePorts.ts");
  installCoreDomainRuntimePorts();
  const { getUnifiedModelsResponse } = await import("../src/catalog/catalog.ts");
  const key = await keys.createApiKey("catalog-policy", "test");
  await keys.updateApiKeyPermissions(key.id, { modelAccessMode: "restricted", allowedModels: ["codex/gpt-5.6-sol-high"] });
  const request = (url = "http://localhost/v1/models", extraHeaders: Record<string, string> = {}) =>
    new Request(url, { headers: { Authorization: `Bearer ${key.key}`, ...extraHeaders } });
  const fullResponse = await getUnifiedModelsResponse(request(), {}, { internal: true });
  assert.equal(fullResponse.status, 200, await fullResponse.clone().text());
  const full = (await fullResponse.json()).data;
  assert.ok(full.length > 0);
  assert.ok(full.every((m) => m.id.endsWith("gpt-5.6-sol-high")));
  const hiddenResponse = await getUnifiedModelsResponse(request());
  const hidden = (await hiddenResponse.json()).data;
  assert.match(hiddenResponse.headers.get("vary") || "", /x-orbit-effort-variants/i);
  assert.ok(hidden.every((m) => m.id.endsWith("gpt-5.6-sol")));
  assert.ok(hidden.every((m) => m.capabilities.effort_tiers.length === 1 && m.capabilities.effort_tiers[0] === "high"));
  const expandedResponse = await getUnifiedModelsResponse(request("http://localhost/v1/models?effort_variants=expanded"));
  const expanded = (await expandedResponse.json()).data;
  assert.match(expandedResponse.headers.get("vary") || "", /x-orbit-effort-variants/i);
  assert.deepEqual(expanded.map((m) => m.id), full.map((m) => m.id));
  const expandedByHeader = (await (await getUnifiedModelsResponse(
    request("http://localhost/v1/models", { "X-Orbit-Effort-Variants": "expanded" })
  )).json()).data;
  assert.deepEqual(expandedByHeader.map((m) => m.id), full.map((m) => m.id));
  const queryTakesPrecedence = (await (await getUnifiedModelsResponse(
    request("http://localhost/v1/models?effort_variants=collapsed", { "X-Orbit-Effort-Variants": "expanded" })
  )).json()).data;
  assert.deepEqual(queryTakesPrecedence, hidden);
  const internalAgain = (await (await getUnifiedModelsResponse(request(), {}, { internal: true })).json()).data;
  assert.deepEqual(internalAgain, full);
  await keys.updateApiKeyPermissions(key.id, {
    modelAccessMode: "restricted", allowedModels: ["codex/gpt-5.6-sol"],
    blockedModels: ["codex/gpt-5.6-sol-high"],
  });
  const blacklisted = (await (await getUnifiedModelsResponse(request())).json()).data;
  assert.ok(blacklisted.length > 0);
  assert.ok(blacklisted.every((m) => !m.capabilities.effort_tiers.includes("high")));
  await keys.updateApiKeyPermissions(key.id, {
    modelAccessMode: "restricted", allowedModels: ["codex/gpt-5.6-sol"],
    blockedModels: ["codex/gpt-5.6-sol-*"],
  });
  const fullyBlocked = (await (await getUnifiedModelsResponse(request())).json()).data;
  assert.deepEqual(fullyBlocked, []);
});
