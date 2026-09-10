import assert from "node:assert/strict";
import test from "node:test";
import { isValidSupporterKeyFormat, SUPPORTER_KEY_REGEX } from "../src/radar/supporter-key.js";

test("keeps the Radar supporter-key format exact and lowercase", () => {
  const valid = `omr_${"a1".repeat(20)}`;
  assert.equal(SUPPORTER_KEY_REGEX.test(valid), true);
  assert.equal(isValidSupporterKeyFormat(valid), true);
  assert.equal(isValidSupporterKeyFormat(valid.toUpperCase()), false);
  assert.equal(isValidSupporterKeyFormat(` ${valid}`), false);
  assert.equal(isValidSupporterKeyFormat(`omr_${"a".repeat(39)}`), false);
});

test("dynamically loads the app-owned Vertex Anthropic parser and preserves projections", async () => {
  const { parseVertexAnthropicModels } = await import(
    "../src/providers/provider-models-discovery/vertex-anthropic-models-parser.js"
  );
  assert.deepEqual(parseVertexAnthropicModels({
    models: [
      {
        name: "projects/demo/locations/us-central1/publishers/anthropic/models/claude-sonnet-4-6",
        displayName: "Claude Sonnet 4.6",
        description: "Partner model",
      },
      { name: "publishers/anthropic/models/claude-opus-4-1" },
      { name: "" },
    ],
  }), [
    {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      supportedEndpoints: ["chat"],
      targetFormat: "claude",
      description: "Partner model",
      owned_by: "anthropic",
    },
    {
      id: "claude-opus-4-1",
      name: "claude-opus-4-1",
      supportedEndpoints: ["chat"],
      targetFormat: "claude",
      owned_by: "anthropic",
    },
  ]);
  assert.deepEqual(parseVertexAnthropicModels(null), []);
  assert.deepEqual(parseVertexAnthropicModels({ models: "invalid" }), []);
  assert.deepEqual(
    parseVertexAnthropicModels({
      publisherModels: [{ name: "publishers/anthropic/models/claude-opus-4-8" }],
    }).map((model) => model.id),
    ["claude-opus-4-8"]
  );
});

test("Claude live discovery uses account-appropriate authentication headers", async () => {
  const { assembleProviderModelsHeaders, PROVIDER_MODELS_CONFIG } = await import(
    "../src/providers/provider-models-discovery/discovery/providerModelsConfig.js"
  );
  const config = PROVIDER_MODELS_CONFIG.claude;
  assert.equal(
    assembleProviderModelsHeaders(config, "oauth", { accessToken: "oauth" }).Authorization,
    "Bearer oauth"
  );
  assert.equal(
    assembleProviderModelsHeaders(config, "key", { apiKey: "key" })["x-api-key"],
    "key"
  );
});
