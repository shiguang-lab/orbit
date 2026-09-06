import assert from "node:assert/strict";
import test from "node:test";
import {
  REGISTRY,
  generateAliasMap,
  getRegistryEntry,
  getUnsupportedParams,
} from "../src/config/providerRegistry.js";
import {
  PROVIDER_ID_TO_ALIAS,
  getModelsByProviderId,
  getProviderModel,
  splitClaudeEffortSuffix,
} from "../src/config/providerModels.js";
import {
  getDynamicImageModels,
  registerDynamicImageModelSource,
  resetDynamicImageModelSources,
} from "../src/config/dynamicImageModelSources.js";

test("registry and model queries share one catalog", () => {
  assert.equal(getRegistryEntry("openai"), REGISTRY.openai);
  assert.deepEqual(generateAliasMap(), PROVIDER_ID_TO_ALIAS);
  assert.ok(getModelsByProviderId("openai").length > 0);
  assert.equal(getProviderModel("openai", "gpt-5.6-sol")?.id, "gpt-5.6-sol");
  assert.ok(Array.isArray(getUnsupportedParams("openai", "gpt-5.6-sol")));
  assert.deepEqual(splitClaudeEffortSuffix("claude-opus-4-8-xhigh"), {
    baseModel: "claude-opus-4-8",
    effort: "xhigh",
  });
});

test("dynamic image model registration remains a shared singleton", () => {
  resetDynamicImageModelSources();
  registerDynamicImageModelSource("test", () => [
    { id: "image-a", name: "Image A", inputModalities: ["text"] },
  ]);
  assert.deepEqual(getDynamicImageModels("test"), [
    { id: "image-a", name: "Image A", inputModalities: ["text"] },
  ]);
  resetDynamicImageModelSources();
});
