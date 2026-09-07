export function normalizeClaudeBaseUrl(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

export interface ClaudeDiscoverySnippetInput {
  /** Orbit root — Claude Code appends `/v1/messages` itself, so no `/v1` suffix. */
  baseUrl: string;
  /** Rendered verbatim; the caller passes a placeholder, never a real key. */
  apiKeyPlaceholder: string;
  /** Optional Claude Code auto-compaction context window. */
  autoCompactWindow?: number;
}

/** Build the Claude Code settings fragment for gateway model discovery. */
export function buildClaudeDiscoverySettingsSnippet(input: ClaudeDiscoverySnippetInput): string {
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: normalizeClaudeBaseUrl(input.baseUrl),
    ANTHROPIC_AUTH_TOKEN: input.apiKeyPlaceholder,
    CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1",
  };

  const window = input.autoCompactWindow;
  if (typeof window === "number" && Number.isFinite(window) && window > 0) {
    env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = String(Math.floor(window));
  }

  return JSON.stringify({ env }, null, 2);
}

export function getStoredClaudeAuthValue(
  env: Record<string, unknown> | null | undefined
): string | null {
  if (!env || typeof env !== "object") return null;

  const authValue = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY;
  if (typeof authValue !== "string") return null;

  const trimmed = authValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}
