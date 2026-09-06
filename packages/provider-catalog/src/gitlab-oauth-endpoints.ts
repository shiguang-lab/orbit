export const GITLAB_DUO_DEFAULT_BASE_URL =
  process.env.GITLAB_DUO_BASE_URL || process.env.GITLAB_BASE_URL || "https://gitlab.com";

function normalizeGitLabBaseUrl(baseUrl?: unknown): string {
  const raw = typeof baseUrl === "string" ? baseUrl.trim() : "";
  return (raw || GITLAB_DUO_DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function buildGitLabOAuthEndpoints(baseUrl?: unknown) {
  const root = normalizeGitLabBaseUrl(baseUrl);
  return {
    root,
    authorizeUrl: `${root}/oauth/authorize`,
    tokenUrl: `${root}/oauth/token`,
    userUrl: `${root}/api/v4/user`,
    directAccessUrl: `${root}/api/v4/code_suggestions/direct_access`,
    publicCompletionsUrl: `${root}/api/v4/code_suggestions/completions`,
  };
}
