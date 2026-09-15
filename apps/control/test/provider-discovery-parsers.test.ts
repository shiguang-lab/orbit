import assert from "node:assert/strict";
import test from "node:test";
import { parseGeminiModelsList } from "../src/providers/provider-models-discovery/discovery/gemini-models-parser.js";
import { normalizeAntigravityModelsResponse } from "../src/providers/provider-models-discovery/discovery/normalizers.js";
import {
  applyOllamaShowCapabilities,
  buildOllamaShowUrl,
  enrichOllamaModelsWithCapabilities,
} from "../src/providers/provider-models-discovery/discovery/ollama-capabilities.js";

test("keeps Antigravity chat and image catalog surfaces in discovery", () => {
  const models = normalizeAntigravityModelsResponse({
    models: {
      "gemini-3.8-flash-low": { displayName: "Gemini 3.8 Flash (Low)", supportsImages: true },
      "gemini-3.8-flash-medium": { displayName: "Gemini 3.8 Flash (Medium)" },
      "gemini-3.8-flash-high": { displayName: "Gemini 3.8 Flash (High)" },
      "gemini-3.1-flash-image": { displayName: "Gemini 3.1 Flash Image" },
    },
    agentModelSorts: [
      {
        groups: [
          {
            modelIds: [
              "gemini-3.8-flash-low",
              "gemini-3.8-flash-medium",
              "gemini-3.8-flash-high",
            ],
          },
        ],
      },
    ],
    imageGenerationModelIds: ["gemini-3.1-flash-image"],
  });

  assert.deepEqual(models.map((model) => model.id), [
    "gemini-3.8-flash",
    "gemini-3.1-flash-image",
  ]);
  assert.deepEqual(models[0]?.supportedThinkingEfforts, ["low", "medium", "high"]);
  assert.deepEqual(models[0]?.effortModelIds, {
    low: "gemini-3.8-flash-low",
    medium: "gemini-3.8-flash-medium",
    high: "gemini-3.8-flash-high",
  });
  assert.equal(models[0]?.supportsVision, true);
  assert.equal(models[1]?.id, "gemini-3.1-flash-image");
  assert.deepEqual(models.at(-1)?.supportedEndpoints, ["images"]);
});

test("aggregates the models object instead of trusting agentModelSorts", () => {
  const models = normalizeAntigravityModelsResponse({
    models: {
      "gemini-3.8-flash-tiered": { supportsThinking: true },
      "gemini-3.7-flash-tiered": { supportsThinking: true },
      "gemini-3.1-pro-low": { displayName: "Gemini 3.1 Pro (Low)", supportsThinking: true },
      "gemini-pro-agent": { displayName: "Gemini 3.1 Pro (High)", supportsThinking: true },
      "claude-opus-4-6-thinking": {
        displayName: "Claude Opus 4.6 (Thinking)",
        supportsThinking: true,
      },
      "gpt-oss-120b-medium": { displayName: "GPT-OSS 120B (Medium)", supportsThinking: true },
      "not-in-agent-sort": { displayName: "Additional model" },
    },
    agentModelSorts: [{ groups: [{ modelIds: ["gpt-oss-120b-medium"] }] }],
    tieredModelIds: {
      flash: ["gemini-3.8-flash-tiered", "gemini-3.7-flash-tiered"],
    },
  });

  assert.deepEqual(models.map((model) => model.id), [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.1-pro",
    "claude-opus-4-6",
    "gpt-oss-120b",
    "not-in-agent-sort",
  ]);
  assert.equal(models[0]?.tieredModelId, "gemini-3.8-flash-tiered");
  assert.deepEqual(models[0]?.supportedThinkingEfforts, ["low", "medium", "high"]);
  assert.equal(models[1]?.tieredModelId, "gemini-3.7-flash-tiered");
  assert.deepEqual(models[1]?.supportedThinkingEfforts, ["low", "medium", "high"]);
  assert.equal(models[2]?.effortModelIds?.high, "gemini-pro-agent");
  assert.equal(models[3]?.thinkingModelId, "claude-opus-4-6-thinking");
});

test("preserves Gemini method mapping, model heuristics, metadata, and retirement filtering", () => {
  assert.deepEqual(parseGeminiModelsList({ models: [
    {
      name: "models/gemini-chat",
      displayName: "Gemini Chat",
      supportedGenerationMethods: ["generateContent", "embedContent"],
      inputTokenLimit: 10,
      outputTokenLimit: 20,
      description: "chat model",
      thinking: true,
    },
    { name: "models/veo-3", supportedGenerationMethods: ["predictLongRunning"] },
    { name: "models/imagen-4", supportedGenerationMethods: ["predictLongRunning"] },
    { name: "models/ignored", supportedGenerationMethods: ["countTokens"] },
    { name: "models/gemini-3.5-flash", supportedGenerationMethods: ["generateContent"] },
  ] }), [
    {
      name: "Gemini Chat",
      displayName: "Gemini Chat",
      supportedGenerationMethods: ["generateContent", "embedContent"],
      inputTokenLimit: 10,
      outputTokenLimit: 20,
      description: "chat model",
      thinking: true,
      id: "gemini-chat",
      supportedEndpoints: ["chat", "embeddings"],
      supportsThinking: true,
    },
    {
      name: "veo-3",
      supportedGenerationMethods: ["predictLongRunning"],
      id: "veo-3",
      supportedEndpoints: ["videos"],
    },
    {
      name: "imagen-4",
      supportedGenerationMethods: ["predictLongRunning"],
      id: "imagen-4",
      supportedEndpoints: ["images"],
    },
  ]);
});

test("preserves Ollama URL and capability projection", () => {
  assert.equal(buildOllamaShowUrl(" https://ollama.test/v1/chat/completions/// "), "https://ollama.test/api/show");
  assert.deepEqual(applyOllamaShowCapabilities(
    { id: "llama", retained: true },
    { capabilities: [" Completion ", "embedding", "vision", "tools", "thinking", "completion"] },
  ), {
    id: "llama",
    retained: true,
    apiFormat: "chat-completions",
    supportedEndpoints: ["chat", "embeddings"],
    supportsVision: true,
    supportsTools: true,
    supportsThinking: true,
  });
  assert.deepEqual(applyOllamaShowCapabilities({ id: "same" }, { capabilities: "invalid" }), { id: "same" });
});

test("caps Ollama show concurrency at four, preserves order, and fails open per model", async () => {
  const models = Array.from({ length: 9 }, (_, index) => ({ id: `model-${index}`, index }));
  let active = 0;
  let maximumActive = 0;
  const result = await enrichOllamaModelsWithCapabilities(models, async (modelId) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
    if (modelId === "model-5") throw new Error("show failed");
    return { capabilities: ["embedding"] };
  });

  assert.equal(maximumActive, 4);
  assert.deepEqual(result.map((model) => model.id), models.map((model) => model.id));
  assert.equal(result[0]?.apiFormat, "embeddings");
  assert.deepEqual(result[5], models[5]);
});

test("filters out internal Antigravity models marked with isInternal or API_PROVIDER_INTERNAL", () => {
  const models = normalizeAntigravityModelsResponse({
    models: {
      "gemini-3.7-flash": {
        displayName: "Gemini 3.7 Flash",
        apiProvider: "API_PROVIDER_GOOGLE_GEMINI",
        supportsThinking: true,
      },
      "claude-sonnet-4-6": {
        displayName: "Claude Sonnet 4.6",
        apiProvider: "API_PROVIDER_ANTHROPIC_VERTEX",
        supportsThinking: true,
      },
      "chat_23310": {
        displayName: "Chat_23310",
        isInternal: true,
        apiProvider: "API_PROVIDER_INTERNAL",
      },
      "chat_20706": {
        displayName: "Chat_20706",
        isInternal: true,
        apiProvider: "API_PROVIDER_INTERNAL",
      },
    },
  });

  assert.deepEqual(
    models.map((model) => model.id),
    ["gemini-3.7-flash", "claude-sonnet-4-6"]
  );
});

