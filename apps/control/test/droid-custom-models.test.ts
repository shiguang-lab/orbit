import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDroidCustomModels,
  isShiguangGatewayCustomModel,
  normalizeDroidModelList,
} from "../src/cli-tools/migrated-handlers/droid-settings/custom-models.js";

test("normalizes model arrays in input order and prefers them over the legacy model", () => {
  assert.deepEqual(normalizeDroidModelList({
    model: "legacy",
    models: [" model-a ", "", 42, "model-b", "model-a", null],
  }), ["model-a", "model-b"]);
  assert.deepEqual(normalizeDroidModelList({ model: " legacy-model " }), ["legacy-model"]);
  assert.deepEqual(normalizeDroidModelList({ model: 42, models: "not-an-array" }), []);
});

test("builds the established Factory Droid entry shape", () => {
  assert.deepEqual(buildDroidCustomModels(["model-a", "model-b"], {
    baseUrl: "http://127.0.0.1:8787/v1",
    apiKey: "secret",
  }), [
    {
      model: "model-a",
      id: "custom:ShiguangGateway-0",
      index: 0,
      baseUrl: "http://127.0.0.1:8787/v1",
      apiKey: "secret",
      displayName: "model-a",
      maxOutputTokens: 131072,
      noImageSupport: false,
      provider: "openai",
    },
    {
      model: "model-b",
      id: "custom:ShiguangGateway-1",
      index: 1,
      baseUrl: "http://127.0.0.1:8787/v1",
      apiKey: "secret",
      displayName: "model-b",
      maxOutputTokens: 131072,
      noImageSupport: false,
      provider: "openai",
    },
  ]);
});

test("promotes an active model and regenerates indexes and ids", () => {
  const entries = buildDroidCustomModels(["model-a", "model-b", "model-c"], {
    baseUrl: "https://gateway.example/v1",
    apiKey: "secret",
    activeModel: "model-c",
  });

  assert.deepEqual(entries.map(({ model, index, id }) => ({ model, index, id })), [
    { model: "model-c", index: 0, id: "custom:ShiguangGateway-0" },
    { model: "model-a", index: 1, id: "custom:ShiguangGateway-1" },
    { model: "model-b", index: 2, id: "custom:ShiguangGateway-2" },
  ]);
});

test("keeps input order for an empty or unknown active model and rejects an empty list", () => {
  for (const activeModel of ["", "missing-model"]) {
    const entries = buildDroidCustomModels(["model-a", "model-b"], {
      baseUrl: "https://gateway.example/v1",
      apiKey: "secret",
      activeModel,
    });
    assert.deepEqual(entries.map((entry) => entry.model), ["model-a", "model-b"]);
  }
  assert.throws(
    () => buildDroidCustomModels([], { baseUrl: "https://gateway.example/v1", apiKey: "secret" }),
    /requires at least one model/,
  );
});

test("recognizes only ShiguangGateway-owned custom model ids", () => {
  assert.equal(isShiguangGatewayCustomModel({ id: "custom:ShiguangGateway-0" }), true);
  assert.equal(isShiguangGatewayCustomModel({ id: "custom:Other-0" }), false);
  assert.equal(isShiguangGatewayCustomModel({ id: 42 }), false);
  assert.equal(isShiguangGatewayCustomModel(null), false);
});
