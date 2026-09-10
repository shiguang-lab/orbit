import assert from "node:assert/strict";
import test from "node:test";
import { getModelSpec } from "@orbit/contracts/model-specs";
import { isVisionModelId } from "@orbit/contracts/vision-models";
import { getDefaultPricing } from "@orbit/core/pricing/defaults";
import { REGISTRY } from "@orbit/providers/providers";
import { GLM_SHARED_MODELS } from "@orbit/providers/support/config/glmProvider";
import { DefaultExecutor } from "../src/executors/default.js";

test("GLM-5.3-Flash catalog, capabilities, and pricing are registered", () => {
  const model = GLM_SHARED_MODELS.find((entry) => entry.id === "glm-5.3-flash");
  assert.equal(model?.contextLength, 1_000_000);
  assert.equal(model?.maxOutputTokens, 131_072);
  assert.equal(model?.supportsVision, true);
  assert.equal(REGISTRY.zai.models.some((entry) => entry.id === "glm-5.3-flash"), true);
  assert.equal(getModelSpec("glm-5.3-flash")?.supportsVision, true);
  assert.equal(isVisionModelId("glm-5.3-flash"), true);
  assert.equal(getDefaultPricing().glm["glm-5.3-flash"].input, 0.075);
});

test("Z.ai GLM-5.3-Flash requests receive safe reasoning and tool-stream defaults", () => {
  const executor = new DefaultExecutor("zai");
  const transformed = executor.transformRequest(
    "glm-5.3-flash",
    { model: "glm-5.3-flash", messages: [], tools: [{ type: "function" }] },
    true,
    {},
  ) as Record<string, unknown>;

  assert.equal(transformed.reasoning_effort, "low");
  assert.deepEqual(transformed.thinking, { type: "enabled", clear_thinking: false });
  assert.equal(transformed.tool_stream, true);
});
