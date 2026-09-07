import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "jsonc-parser";
import {
  buildOpenCodeProviderConfig,
  mergeOpenCodeConfigText,
} from "../src/cli-tools/migrated-handlers/guide-settings/opencode-config.js";

test("normalizes provider values, models, labels, and defaults", () => {
  const config = buildOpenCodeProviderConfig({
    baseUrl: "  https://gateway.example/v1///  ",
    apiKey: "",
    models: [" /model-a ", "model-a", "", "//model-b"],
    modelLabels: { "/model-a": " Model A ", "model-b": "", "": "ignored" },
  });

  assert.deepEqual(config.options, {
    baseURL: "https://gateway.example/v1",
    apiKey: "sk_orbit",
  });
  assert.deepEqual(Object.keys(config.models), ["model-a", "model-b"]);
  assert.equal(config.models["model-a"].name, "Model A");
  assert.equal(config.models["model-b"].name, "model-b");
  assert.deepEqual(config.models["model-a"].limit, { context: 128_000, output: 8_192 });
});

test("creates the established document for an empty config", () => {
  const text = mergeOpenCodeConfigText("  ", {
    baseUrl: "http://127.0.0.1:8787/v1",
    apiKey: "secret",
    model: "model-a",
  });
  assert.equal(text.endsWith("\n"), false);
  const parsed = JSON.parse(text);
  assert.equal(parsed.$schema, "https://opencode.ai/config.json");
  assert.equal(parsed.provider.orbit.options.baseURL, "http://127.0.0.1:8787/v1");
  assert.equal(parsed.providers.orbit.settings.apiKey, "secret");
});

test("preserves JSONC comments, trailing commas, unrelated fields, and existing schema", () => {
  const existing = `{
  // user comment must remain
  "$schema": "https://example.test/custom-schema.json",
  "theme": "dark", // inline comment and comma remain
  "provider": {
    "other": { "name": "Other" },
  },
  "providers": {
    "otherV2": { "name": "Other v2" },
  },
}`;

  const result = mergeOpenCodeConfigText(existing, {
    baseUrl: "https://gateway.example/v1",
    apiKey: "secret",
    models: ["model-a"],
  });

  assert.match(result, /\/\/ user comment must remain/);
  assert.match(result, /"theme": "dark", \/\/ inline comment and comma remain/);
  assert.match(result, /,\s*\n\}/);

  const parsed = parse(result, undefined, { allowTrailingComma: true, disallowComments: false });
  assert.equal(parsed.$schema, "https://example.test/custom-schema.json");
  assert.equal(parsed.provider.other.name, "Other");
  assert.equal(parsed.providers.otherV2.name, "Other v2");
  assert.equal(parsed.provider.orbit.models["model-a"].name, "model-a");
  assert.equal(parsed.providers.orbit.models["model-a"].name, "model-a");
});

test("replaces only managed provider entries in an existing document", () => {
  const existing = JSON.stringify({
    untouched: { enabled: true },
    provider: { other: { value: 1 }, orbit: { stale: true } },
    providers: { other: { value: 2 }, orbit: { stale: true } },
  }, null, 4);

  const result = mergeOpenCodeConfigText(existing, {
    baseUrl: "https://new.example/v1",
    apiKey: "new-key",
    models: ["new-model"],
  });
  const parsed = JSON.parse(result);
  assert.deepEqual(parsed.untouched, { enabled: true });
  assert.deepEqual(parsed.provider.other, { value: 1 });
  assert.deepEqual(parsed.providers.other, { value: 2 });
  assert.equal(parsed.provider.orbit.stale, undefined);
  assert.equal(parsed.providers.orbit.stale, undefined);
});

test("rejects invalid JSONC and non-object roots instead of overwriting them", () => {
  assert.throws(
    () => mergeOpenCodeConfigText("{ invalid", { model: "model-a" }),
    /invalid JSONC .* at offset .* refusing to overwrite/,
  );
  assert.throws(
    () => mergeOpenCodeConfigText("[]", { model: "model-a" }),
    /root must be an object.*refusing to overwrite/,
  );
});
