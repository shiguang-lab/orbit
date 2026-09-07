export const USAGE_SUPPORTED_PROVIDERS = [
  "antigravity",
  "agy",
  "kiro",
  "amazon-q",
  "github",
  "codex",
  "claude",
  "cursor",
  "qoder",
  "kimi-coding",
  "kimi-coding-apikey",
  "glm",
  "glm-cn",
  "zai",
  "glmt",
  "opencode-go",
  "ollama-cloud",
  "minimax",
  "minimax-cn",
  "crof",
  "nanogpt",
  "deepseek",
  "xiaomi-mimo",
  "xiaomi-mimo-token-plan",
  "vertex",
  "vertex-partner",
  "codebuddy-cn",
  "promptql",
  "pql",
  "adobe-firefly",
  "firefly",
  "hyperagent",
  "ha",
  "xai-oauth",
  "xao",
  "grok-cli",
  "firecrawl",
  "volcengine-agent-plan",
  "volcengine-coding-plan",
  "command-code",
  "conol-web",
  "cnl",
  "bailian-coding-plan",
  "qwen-cloud-token-plan",
  "agentrouter",
];

export function supportsProviderQuota(providerId: string | undefined): boolean {
  if (!providerId) return false;
  return USAGE_SUPPORTED_PROVIDERS.includes(providerId.toLowerCase());
}

export const PROVIDER_LABEL: Record<string, string> = {
  antigravity: "Antigravity",
  github: "GitHub Copilot",
  kiro: "Kiro AI",
  "amazon-q": "Amazon Q",
  codex: "OpenAI Codex",
  claude: "Claude Code",
  glm: "GLM (Z.AI)",
  zai: "Z.AI",
  glmt: "GLM Thinking",
  "opencode-go": "OpenCode Go",
  "ollama-cloud": "Ollama Cloud",
  "kimi-coding": "Kimi Coding",
  minimax: "MiniMax",
  "minimax-cn": "MiniMax CN",
  nanogpt: "NanoGPT",
  deepseek: "DeepSeek",
  "xai-oauth": "xAI OAuth (Grok)",
  xao: "xAI OAuth (Grok)",
  "grok-cli": "Grok Build",
};

const QUOTA_LABEL_MAP: Record<string, string> = {
  chat: "Chat",
  completions: "Completions",
  premium_interactions: "Premium",
  session: "Session",
  weekly: "Weekly",
  code_review: "Code Review",
  code_review_weekly: "Code Review Weekly",
  gpt_5_3_codex_spark_session: "GPT-5.3-Codex-Spark Session",
  gpt_5_3_codex_spark_weekly: "GPT-5.3-Codex-Spark Weekly",
  agentic_request: "Agentic",
  agentic_request_freetrial: "Agentic (Trial)",
  credits: "AI Credits",
  models: "Models",
  mcp_monthly: "Monthly",
  "search-prime": "Web Search",
  "web-reader": "Web Reader",
  zread: "Zread",
  "5 Hours Quota": "5 Hours",
  "Weekly Quota": "Weekly",
  "Monthly Tools": "Monthly Tools",
  tokens: "Tokens",
  time_limit: "Time Limit",
  banked_reset_credits: "Banked Reset Credits",
  gemini_weekly: "Gemini Weekly",
  claude_gpt_weekly: "Claude & GPT Weekly",
};

function toTitleCaseWords(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatQuotaLabel(name: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return "";

  const mapped = QUOTA_LABEL_MAP[trimmed];
  if (mapped) return mapped;

  if (/^session\s*\(\d+[hm]\)$/i.test(trimmed)) {
    return "Session (5h)";
  }

  if (/^weekly\s*\(\d+d\)$/i.test(trimmed)) {
    return "Weekly (7d)";
  }

  const weeklyModelMatch = trimmed.match(/^weekly\s+(.+?)\s*\(\d+d\)$/i);
  if (weeklyModelMatch) {
    return `Weekly ${toTitleCaseWords(weeklyModelMatch[1])}`;
  }

  return toTitleCaseWords(trimmed.replace(/_/g, " "));
}

export function formatResetTime(date: string | Date | null | undefined): string {
  if (!date) return "-";

  try {
    const resetDate = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = (resetDate as any) - (now as any);

    if (diffMs <= 0) return "已重置";

    const totalMinutes = Math.ceil(diffMs / (1000 * 60));

    if (totalMinutes < 60) {
      return `${totalMinutes}分`;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalHours < 24) {
      return `${totalHours}小时 ${remainingMinutes}分`;
    }

    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `${days}天 ${remainingHours}小时`;
  } catch {
    return "-";
  }
}

export function calculatePercentage(used: number | undefined, total: number | undefined): number {
  if (typeof used !== "number" || typeof total !== "number" || total <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, ((total - used) / total) * 100));
}

export type PurchaseTypeKey = "all" | "oauth-sub" | "oauth-free" | "apikey";
export type StatusKey = "all" | "critical" | "alert" | "ok" | "empty";

export function getPurchaseType(authType: string | undefined, plan: string | undefined): PurchaseTypeKey {
  if (authType === "apikey") return "apikey";
  if (authType === "oauth") {
    const p = (plan || "").toLowerCase();
    if (p === "free" || !p || p === "unknown") return "oauth-free";
    return "oauth-sub";
  }
  return "oauth-free";
}

export function getWorstStatus(quotas: any[] | undefined): StatusKey {
  if (!quotas || quotas.length === 0) return "empty";
  let worst: StatusKey = "ok";
  for (const q of quotas) {
    const pct = q.unlimited ? 100 : (q.remainingPercentage ?? calculatePercentage(q.used, q.total));
    if (pct <= 20) return "critical";
    if (pct <= 50 && worst === "ok") worst = "alert";
  }
  return worst;
}

export function getQuotaVisibilityKey(quota: any): string {
  if (!quota || typeof quota !== "object") return "";
  return String(quota.modelKey || quota.name || "").trim();
}

export function filterQuotasByVisibility(
  provider: string,
  quotas: any[] = [],
  quotaVisibility: Record<string, { hidden?: string[] }> = {}
): any[] {
  if (!Array.isArray(quotas) || quotas.length === 0) return [];
  const hidden = new Set(quotaVisibility?.[provider]?.hidden || []);
  if (hidden.size === 0) return quotas;
  return quotas.filter((quota) => !hidden.has(getQuotaVisibilityKey(quota)));
}

export function getHiddenQuotaRows(
  provider: string,
  quotas: any[] = [],
  quotaVisibility: Record<string, { hidden?: string[] }> = {}
): any[] {
  if (!Array.isArray(quotas) || quotas.length === 0) return [];
  const hidden = new Set(quotaVisibility?.[provider]?.hidden || []);
  if (hidden.size === 0) return [];
  return quotas.filter((quota) => hidden.has(getQuotaVisibilityKey(quota)));
}
