import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCodexBaseUrl } from "../src/cli-tools/codex-settings/base-url.js";
import { migrateCodexFeatureFlags } from "../src/cli-tools/codex-settings/feature-flags.js";

test("normalizes Codex base URLs without changing wire API path semantics", () => {
  assert.equal(normalizeCodexBaseUrl("   "), "");
  assert.equal(normalizeCodexBaseUrl("https://gateway.example/api/?key=value#fragment"), "https://gateway.example/v1");
  assert.equal(normalizeCodexBaseUrl("https://gateway.example/v1/"), "https://gateway.example/v1");
  assert.equal(normalizeCodexBaseUrl("https://gateway.example/responses", "chat"), "https://gateway.example/responses/v1");
  assert.equal(normalizeCodexBaseUrl("https://gateway.example/responses/compact", "responses"), "https://gateway.example/v1");
  assert.equal(normalizeCodexBaseUrl("gateway.example/api"), "gateway.example/v1");
  assert.equal(normalizeCodexBaseUrl("gateway.example/responses/compact", "responses"), "gateway.example/v1");
});

test("renames the deprecated Codex hook flag in place and preserves its value", () => {
  const parsed = {
    _root: { model: "gpt-5" },
    _sections: { features: { codex_hooks: false, other: "kept" } },
  };

  assert.strictEqual(migrateCodexFeatureFlags(parsed), parsed);
  assert.deepEqual(parsed, {
    _root: { model: "gpt-5" },
    _sections: { features: { hooks: false, other: "kept" } },
  });
});

test("keeps an existing hooks value while removing the deprecated flag", () => {
  const parsed = {
    _root: {},
    _sections: { features: { codex_hooks: false, hooks: true } },
  };

  migrateCodexFeatureFlags(parsed);
  assert.deepEqual(parsed._sections.features, { hooks: true });
});

test("leaves configs without the deprecated feature flag unchanged", () => {
  const withoutFeatures = { _root: {}, _sections: {} };
  const withoutLegacyFlag = { _root: {}, _sections: { features: { hooks: true } } };

  assert.strictEqual(migrateCodexFeatureFlags(withoutFeatures), withoutFeatures);
  assert.strictEqual(migrateCodexFeatureFlags(withoutLegacyFlag), withoutLegacyFlag);
  assert.deepEqual(withoutLegacyFlag._sections.features, { hooks: true });
});
