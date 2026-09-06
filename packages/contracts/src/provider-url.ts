/** Normalize a provider base URL without changing its path semantics. */
export function normalizeProviderBaseUrl(baseUrl: string): string {
  const value = typeof baseUrl === "string" ? baseUrl : "";
  return value.trim().replace(/\/$/, "");
}

/** Resolve the sibling `/models` discovery endpoint for a provider base URL. */
export function addProviderModelsSuffix(baseUrl: string): string {
  const normalized = normalizeProviderBaseUrl(baseUrl);
  if (!normalized) return "";
  const separatorIndex = normalized.search(/[?#]/);
  const endpoint = separatorIndex === -1 ? normalized : normalized.slice(0, separatorIndex);
  for (const suffix of ["/chat/completions", "/responses", "/chat", "/messages"]) {
    if (endpoint.endsWith(suffix)) return `${endpoint.slice(0, -suffix.length)}/models`;
  }
  return endpoint.endsWith("/models") ? endpoint : `${endpoint}/models`;
}
