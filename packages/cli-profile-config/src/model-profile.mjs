const thinkingPatterns = [
  { re: /kmc\/kimi-k2\.7/, name: "kimi-k27", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /kmc\/kimi-k2\.6/, name: "kimi-k26", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /glm\/glm-5\.2-max/, name: "glm52max", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /glm\/glm-5\.2$/, name: "glm52", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /opencode-go\/mimo-v2\.5-pro/, name: "mimo-pro", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /opencode-go\/qwen3\.7-plus/, name: "qwen37plus", ctx: 32768, compact: 28000, toolLimit: 16384 },
];
const goodPatterns = [
  { re: /ollamacloud\/deepseek-v4-pro/, name: "deepseek-pro", ctx: 131072, compact: 112000, toolLimit: 32768 },
  { re: /opencode-go\/mimo-v2\.5$/, name: "mimo", ctx: 131072, compact: 112000, toolLimit: 32768 },
];
const simplePatterns = [
  { re: /ollamacloud\/gemma4:31b/, name: "gemma4", ctx: 32768, compact: 28000, toolLimit: 16384 },
  { re: /ollamacloud\/nemotron-3-super/, name: "nemotron", ctx: 32768, compact: 28000, toolLimit: 16384 },
  { re: /ollamacloud\/gpt-oss:20b/, name: "gptoss", ctx: 32768, compact: 28000, toolLimit: 16384 },
];
const fastPatterns = [
  { re: /ollamacloud\/deepseek-v4-flash/, name: "deepseek-flash", ctx: 65536, compact: 56000, toolLimit: 16384 },
  { re: /ollamacloud\/gemini-3-flash/, name: "gemini-flash", ctx: 1000000, compact: 850000, toolLimit: 32768 },
  { re: /glm\/glm-5-turbo/, name: "glm5turbo", ctx: 131072, compact: 112000, toolLimit: 16384 },
  { re: /glm\/glm-4\.7-flash/, name: "glm47flash", ctx: 131072, compact: 112000, toolLimit: 16384 },
];

export function categoriseModel(modelId) {
  const id = modelId.toLowerCase();
  for (const profile of thinkingPatterns) if (profile.re.test(id)) return { ...profile, effort: "xhigh", summary: true };
  for (const profile of goodPatterns) if (profile.re.test(id)) return { ...profile, effort: "high", summary: false };
  for (const profile of simplePatterns) if (profile.re.test(id)) return { ...profile, effort: undefined, summary: false };
  for (const profile of fastPatterns) if (profile.re.test(id)) return { ...profile, effort: "low", summary: false };
  return null;
}

function shortHash(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

export function profileNameFromModelId(modelId) {
  const normalized = String(modelId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = normalized || "model";
  if (base.length <= 96) return base;
  return `${base.slice(0, 84).replace(/-+$/g, "")}-${shortHash(base)}`;
}

function hasAnyValue(values, patterns) {
  return values.some((value) => patterns.some((pattern) => pattern.test(value)));
}

export function isCodexCompatibleTextModel(model) {
  if (typeof model === "string") return true;
  const id = String(model?.id ?? "").toLowerCase();
  const type = String(model?.type ?? "").toLowerCase();
  const outputModalities = Array.isArray(model?.output_modalities)
    ? model.output_modalities.map((value) => String(value).toLowerCase())
    : [];
  if (type && !["chat", "text", "language", "llm", "model"].includes(type)) return false;
  const unsupportedPatterns = [
    /(^|[/_-])(image|img|video|veo|seedance|audio|speech|voice|tts|stt|whisper)([/_-]|$)/,
    /(^|[/_-])(embedding|embeddings|embed|rerank|moderation|transcription)([/_-]|$)/,
  ];
  if (hasAnyValue([id, type], unsupportedPatterns)) return false;
  if (hasAnyValue(outputModalities, [/^(image|video|audio)$/])) return false;
  return outputModalities.length === 0 || outputModalities.includes("text");
}

function firstPositiveNumber(...values) {
  for (const value of values) if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return null;
}

export function fallbackCodexProfile(modelId, model) {
  if (!isCodexCompatibleTextModel(model)) return null;
  const ctx = typeof model === "string"
    ? 128000
    : firstPositiveNumber(model.context_length, model.max_context_window_tokens, model.max_input_tokens) ?? 128000;
  const maxOutput = typeof model === "string" ? null : firstPositiveNumber(model.max_output_tokens, model.output_token_limit);
  return {
    name: profileNameFromModelId(modelId),
    ctx,
    compact: Math.floor(ctx * 0.85),
    summary: false,
    toolLimit: Math.min(Math.max(maxOutput ?? 16384, 8192), 32768),
  };
}
