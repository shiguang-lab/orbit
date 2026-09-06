import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GET,
  OPTIONS,
  type V1BetaModelsDependencies,
} from "../src/gemini-v1beta/v1beta-models-logic.js";

function dependencies(
  overrides: Partial<V1BetaModelsDependencies> = {},
): V1BetaModelsDependencies {
  return {
    providerModels: {
      openai: [{ id: "static", name: "Static" }],
      anthropic: [{ id: "inactive" }],
      gemini: [{ id: "obsolete" }],
    },
    providerIdToAlias: {},
    getProviderConnections: async () => [
      { provider: "openai", isActive: true },
      { provider: "anthropic", isActive: false },
      { provider: "gemini", isActive: true },
    ],
    getAllCustomModels: async () => ({
      openai: [
        { id: "static", inputTokenLimit: 42 },
        { id: "hidden", isHidden: true },
      ],
    }),
    getAllSyncedAvailableModels: async () => ({
      openai: [{ id: "synced", name: "Synced", supportsThinking: true }],
      gemini: [{ id: "ignored-duplicate-source" }],
    }),
    getSyncedAvailableModels: async () => [{ id: "current", name: "Gemini Current" }],
    getResolvedModelCapabilities: () => ({
      maxInputTokens: 1000,
      maxOutputTokens: 200,
      supportsThinking: false,
    }),
    getSyncedCapabilities: () => ({}),
    mergeCustomModelMetadata: (base, custom) => ({ ...base, ...custom }),
    sanitizeErrorMessage: () => "safe error",
    ...overrides,
  };
}

test("lists only active providers and preserves Gemini sync/custom metadata rules", async () => {
  const response = await GET(dependencies());
  const body = await response.json() as { models: Array<Record<string, unknown>> };

  assert.equal(response.status, 200);
  assert.deepEqual(body.models.map((model) => model.name), [
    "models/openai/static",
    "models/gemini/current",
    "models/openai/synced",
  ]);
  assert.equal(body.models[0]?.inputTokenLimit, 42);
  assert.equal(body.models[2]?.thinking, true);
  assert.equal(body.models.some((model) => model.name === "models/anthropic/inactive"), false);
  assert.equal(body.models.some((model) => model.name === "models/openai/hidden"), false);
});

test("keeps CORS preflight and sanitized top-level failure responses", async () => {
  const preflight = OPTIONS();
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");

  const response = await GET(dependencies({
    getSyncedCapabilities: () => {
      throw new Error("secret upstream detail");
    },
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: { message: "safe error" } });
});
