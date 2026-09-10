import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSelectionCache,
  getBestVisionModel,
  type VisionBridgeRouterDeps,
} from "../src/lib/guardrails/visionBridgeRouter.ts";
import { registerProviderRuntimePorts } from "../src/runtime/providerRuntimePorts.ts";

registerProviderRuntimePorts({
  parseModel(model) {
    const value = typeof model === "string" ? model : "";
    const separator = value.indexOf("/");
    return {
      provider: separator > 0 ? value.slice(0, separator) : null,
      model: separator > 0 ? value.slice(separator + 1) : value || null,
      isAlias: false,
      providerAlias: separator > 0 ? value.slice(0, separator) : null,
      extendedContext: false,
    };
  },
  resolveCanonicalProviderModel: (provider, model) => ({
    provider: provider ?? null,
    model: model ?? null,
  }),
  getRegisteredProviderEffortBaseModelId: () => null,
});

const indeterminateCatalog: VisionBridgeRouterDeps["getActiveSyncedCatalog"] = async () => ({
  authoritative: false,
  models: [],
});

test.beforeEach(() => clearSelectionCache());

test("auto/* bypasses the virtual-id credential guard when a pool member is usable", async () => {
  const fixedModel = "auto/vision";
  const selected = await getBestVisionModel(
    { fixedModel },
    {
      hasUsableCredentials: async (model) => (model.startsWith("auto/") ? false : null),
      getActiveSyncedCatalog: indeterminateCatalog,
    }
  );
  assert.equal(selected, fixedModel);
});

test("bare auto is also treated as a virtual combo", async () => {
  const selected = await getBestVisionModel(
    { fixedModel: "auto" },
    {
      hasUsableCredentials: async (model) => (model === "auto" ? false : null),
      getActiveSyncedCatalog: indeterminateCatalog,
    }
  );
  assert.equal(selected, "auto");
});

test("cached pool selections still return the virtual combo id", async () => {
  const deps: VisionBridgeRouterDeps = {
    hasUsableCredentials: async (model) => (model.startsWith("auto/") ? false : null),
    getActiveSyncedCatalog: indeterminateCatalog,
  };
  assert.ok(await getBestVisionModel({}, deps));
  assert.equal(await getBestVisionModel({ fixedModel: "auto/vision" }, deps), "auto/vision");
});

test("virtual combo is rejected when the entire vision pool is unusable", async () => {
  const selected = await getBestVisionModel(
    { fixedModel: "auto/vision" },
    {
      hasUsableCredentials: async () => false,
      getActiveSyncedCatalog: indeterminateCatalog,
    }
  );
  assert.equal(selected, null);
});

test("concrete fixed models still fall through when credentials are unusable", async () => {
  const selected = await getBestVisionModel(
    { fixedModel: "openai/gpt-4o-mini" },
    {
      hasUsableCredentials: async () => false,
      getActiveSyncedCatalog: indeterminateCatalog,
    }
  );
  assert.equal(selected, null);
});
