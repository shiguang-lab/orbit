import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoriseModel,
  fallbackCodexProfile,
  isCodexCompatibleTextModel,
  profileNameFromModelId,
} from "@shiguang-gateway/cli-profile-config/model-profile";

test("preserves curated categories used by every CLI generator", () => {
  assert.deepEqual(categoriseModel("glm/glm-5.2"), {
    re: /glm\/glm-5\.2$/,
    name: "glm52",
    ctx: 131072,
    compact: 112000,
    toolLimit: 32768,
    effort: "xhigh",
    summary: true,
  });
  assert.equal(categoriseModel("unknown/model"), null);
});

test("fallback profiles preserve text filtering and catalog token limits", () => {
  assert.equal(isCodexCompatibleTextModel({ id: "vendor/image-model", type: "image" }), false);
  assert.equal(isCodexCompatibleTextModel({ id: "vendor/chat", output_modalities: ["text"] }), true);
  assert.deepEqual(
    fallbackCodexProfile("Vendor/New Model", {
      id: "Vendor/New Model",
      context_length: 10000,
      max_output_tokens: 50000,
    }),
    { name: "vendor-new-model", ctx: 10000, compact: 8500, summary: false, toolLimit: 32768 },
  );
});

test("profile names stay stable and bounded", () => {
  assert.equal(profileNameFromModelId("Vendor/New Model"), "vendor-new-model");
  assert.equal(profileNameFromModelId("!!!"), "model");
  const long = profileNameFromModelId(`vendor/${"model-".repeat(30)}`);
  assert.ok(long.length <= 96);
  assert.match(long, /^vendor-model-/);
});
