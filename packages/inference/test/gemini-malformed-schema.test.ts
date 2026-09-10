import assert from "node:assert/strict";
import test from "node:test";
import { cleanJSONSchemaForAntigravity } from "../src/translator/helpers/geminiHelper.js";

test("Gemini schema cleanup promotes boolean required and normalizes nested bare maps", () => {
  const cleaned = cleanJSONSchemaForAntigravity({
    type: "object",
    properties: {
      query: { type: "string", required: true },
      opts: { settings: { limit: { type: "number" } } },
    },
  }) as Record<string, unknown>;
  const properties = cleaned.properties as Record<string, Record<string, unknown>>;
  assert.deepEqual(cleaned.required, ["query"]);
  assert.equal("required" in properties.query, false);
  assert.equal(properties.opts.type, "object");
  const settings = (properties.opts.properties as Record<string, Record<string, unknown>>).settings;
  assert.equal(settings.type, "object");
  assert.equal(
    (settings.properties as Record<string, Record<string, unknown>>).limit.type,
    "number"
  );
});

test("Gemini schema cleanup drops non-array required values that are not true", () => {
  const cleaned = cleanJSONSchemaForAntigravity({
    type: "object",
    properties: {
      optional: { type: "string", required: false },
      malformed: { type: "string", required: "yes" },
    },
  }) as Record<string, unknown>;
  const properties = cleaned.properties as Record<string, Record<string, unknown>>;
  assert.equal(properties.optional.required, undefined);
  assert.equal(properties.malformed.required, undefined);
  assert.equal(cleaned.required, undefined);
});
