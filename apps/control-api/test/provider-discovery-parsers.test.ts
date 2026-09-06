import assert from "node:assert/strict";
import test from "node:test";
import { parseGeminiModelsList } from "../src/providers/provider-models-discovery/discovery/gemini-models-parser.js";
import {
  applyOllamaShowCapabilities,
  buildOllamaShowUrl,
  enrichOllamaModelsWithCapabilities,
} from "../src/providers/provider-models-discovery/discovery/ollama-capabilities.js";

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
