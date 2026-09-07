const ROTATING_REFRESH_GROUPS: Readonly<Record<string, string>> = Object.freeze({
  codex: "openai-auth0",
  openai: "openai-auth0",
  claude: "anthropic-oauth",
  "gitlab-duo": "gitlab-duo",
  kiro: "kiro",
  "kimi-coding": "kimi-coding",
});

/** Pure provider capability metadata; contains no locks or runtime state. */
export function getRotatingRefreshGroup(provider: string): string | null {
  return ROTATING_REFRESH_GROUPS[provider] ?? null;
}
