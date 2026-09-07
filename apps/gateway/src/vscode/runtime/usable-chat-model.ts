export type UsableChatModelCandidate = {
  id?: string;
  root?: string;
  name?: string;
  owned_by?: string;
  parent?: string | null;
  type?: string;
  api_format?: string;
  supported_endpoints?: string[];
  output_modalities?: string[];
};

export const TEXT_GENERATION_API_FORMATS = new Set([
  "chat-completions",
  "responses",
  "openai-responses",
]);

function excludesChatAndResponsesEndpoints(model: UsableChatModelCandidate) {
  return (
    Array.isArray(model.supported_endpoints) &&
    model.supported_endpoints.length > 0 &&
    !model.supported_endpoints.includes("chat") &&
    !model.supported_endpoints.includes("responses")
  );
}

function excludesTextOutputModality(model: UsableChatModelCandidate) {
  return (
    Array.isArray(model.output_modalities) &&
    model.output_modalities.length > 0 &&
    !model.output_modalities.includes("text")
  );
}

function isBuiltinAutoModel(model: UsableChatModelCandidate): boolean {
  const id = model.id || model.root || model.name || "";
  const normalized = id.trim().toLowerCase();
  return normalized === "auto" || normalized.startsWith("auto/");
}

export function isUsableChatModel(model: UsableChatModelCandidate) {
  if (typeof model.owned_by === "string" && model.owned_by.trim().toLowerCase() === "combo") {
    if (!isBuiltinAutoModel(model)) {
      return false;
    }
  }
  if (typeof model.parent === "string" && model.parent.length > 0) return false;
  if (typeof model.type === "string" && model.type !== "chat") return false;
  if (
    typeof model.api_format === "string" &&
    !TEXT_GENERATION_API_FORMATS.has(model.api_format)
  ) {
    return false;
  }
  if (excludesChatAndResponsesEndpoints(model)) return false;
  if (excludesTextOutputModality(model)) return false;

  return true;
}
