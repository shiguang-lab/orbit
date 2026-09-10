import assert from "node:assert/strict";
import test from "node:test";
import { REGISTRY } from "@orbit/providers/providers";
import { getExecutor, hasSpecializedExecutor } from "../src/executors/index.js";

test("new upstream providers expose the intended transport contracts", () => {
  assert.equal(REGISTRY["perplexity-agent"]?.format, "openai-responses");
  assert.equal(REGISTRY.seekai?.passthroughModels, true);
  assert.equal(REGISTRY.maxai?.executor, "maxai");
  assert.equal(REGISTRY.uc?.executor, "uc");
  assert.equal(REGISTRY["uc-direct"]?.authHeader, "x-api-key");
});

test("MaxAI and UC resolve specialized executors while API providers use default", async () => {
  assert.equal(hasSpecializedExecutor("maxai"), true);
  assert.equal(hasSpecializedExecutor("uc"), true);
  assert.equal((await getExecutor("maxai")).provider, "maxai");
  assert.equal((await getExecutor("uc")).provider, "uc");
  assert.equal((await getExecutor("seekai")).provider, "seekai");
  assert.equal((await getExecutor("perplexity-agent")).provider, "perplexity-agent");
  assert.equal((await getExecutor("uc-direct")).provider, "uc-direct");
});
