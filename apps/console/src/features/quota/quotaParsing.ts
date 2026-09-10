export function safePercentage(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return Math.max(0, Math.min(100, val));
  if (typeof val === "string") {
    const n = Number.parseFloat(val);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  }
  return undefined;
}

const GLM_QUOTA_ORDER: Record<string, number> = { session: 0, weekly: 1, mcp_monthly: 2 };
const CODEX_QUOTA_ORDER: Record<string, number> = {
  session: 0,
  weekly: 1,
  gpt_5_3_codex_spark_session: 2,
  gpt_5_3_codex_spark_weekly: 3,
  banked_reset_credits: 4,
};
const GLM_FAMILY_PROVIDERS = ["glm", "glm-cn", "glmt", "opencode-go"];
const KIMI_CODING_PROVIDERS = ["kimi-coding", "kimi-coding-apikey"];

export function hasFixedQuotaOrder(providerId: string | undefined): boolean {
  const id = String(providerId || "").toLowerCase();
  return id === "codex" || GLM_FAMILY_PROVIDERS.includes(id) || KIMI_CODING_PROVIDERS.includes(id);
}

export function quotaWindowRank(name: unknown): number | null {
  const key = String(name ?? "").trim().toLowerCase();
  if (!key) return null;
  if (/month/.test(key)) return 2;
  if (/week|7\s*d\b|_7d\b|seven[_\s-]?day/.test(key)) return 1;
  if (/session|hour|\b5\s*h\b|_5h\b/.test(key)) return 0;
  return null;
}

export function hasCanonicalWindowOrder(quotas: unknown): boolean {
  if (!Array.isArray(quotas)) return false;
  const ranks = new Set<number>();
  for (const quota of quotas) {
    if (!quota || (quota as any).isCredits) continue;
    const rank = quotaWindowRank((quota as any).name);
    if (rank !== null) ranks.add(rank);
  }
  return ranks.size >= 2;
}

export function sortQuotasByWindow<T>(quotas: T[]): T[] {
  return [...quotas]
    .map((quota, index) => ({ quota, index }))
    .sort((a, b) => {
      const ra = quotaWindowRank((a.quota as any)?.name) ?? 99;
      const rb = quotaWindowRank((b.quota as any)?.name) ?? 99;
      return ra - rb || a.index - b.index;
    })
    .map((entry) => entry.quota);
}

function quotaEntries(data: any): Array<[string, any]> {
  return data?.quotas && typeof data.quotas === "object" ? Object.entries(data.quotas) : [];
}

function isUnlimitedEmpty(quota: any): boolean {
  return Boolean(quota?.unlimited && (!quota?.total || quota.total <= 0));
}

function isPastResetWindow(resetAt: any): boolean {
  if (!resetAt) return false;
  const resetTime =
    typeof resetAt === "number" ? resetAt : typeof resetAt === "string" ? Date.parse(resetAt) : NaN;
  return Number.isFinite(resetTime) && Date.now() >= resetTime;
}

function getResetAdjustedQuota(quota: any) {
  const usedRaw = Number(quota?.used || 0);
  const totalRaw = Number(quota?.total || 0);
  const total = Number.isFinite(totalRaw) ? totalRaw : 0;
  const remainingRaw = safePercentage(quota?.remainingPercentage);
  const hasPendingUsage = usedRaw > 0 || (remainingRaw !== undefined && remainingRaw < 100);
  const staleAfterReset = isPastResetWindow(quota?.resetAt || null) && hasPendingUsage;

  return {
    staleAfterReset,
    total,
    used: staleAfterReset ? 0 : usedRaw,
    remainingPercentage: staleAfterReset && total > 0 ? 100 : remainingRaw,
  };
}

function normalizeQuotaEntry(name: string, quota: any = {}, extras: any = {}) {
  const adjusted = getResetAdjustedQuota(quota);
  const remaining = Number(quota?.remaining);
  return {
    name,
    used: Number.isFinite(adjusted.used) ? adjusted.used : 0,
    total: adjusted.total,
    ...(Number.isFinite(remaining) ? { remaining } : {}),
    resetAt: quota?.resetAt || null,
    staleAfterReset: adjusted.staleAfterReset,
    ...(adjusted.remainingPercentage !== undefined
      ? { remainingPercentage: adjusted.remainingPercentage }
      : {}),
    ...(quota?.extraCreditsInferred !== undefined
      ? { extraCreditsInferred: Number(quota.extraCreditsInferred) || 0 }
      : {}),
    ...(quota?.overPlan !== undefined ? { overPlan: quota.overPlan === true } : {}),
    ...(quota?.displayName !== undefined ? { displayName: String(quota.displayName) } : {}),
    ...(quota?.isPercentageOnly !== undefined
      ? { isPercentageOnly: quota.isPercentageOnly === true }
      : {}),
    ...extras,
  };
}

function parseGeneric(data: any) {
  return quotaEntries(data).map(([name, quota]) => normalizeQuotaEntry(name, quota));
}

function parseGithub(data: any) {
  return quotaEntries(data)
    .filter(([, quota]) => !isUnlimitedEmpty(quota))
    .map(([name, quota]) => normalizeQuotaEntry(name, quota));
}

function parseGlmFamily(data: any) {
  return quotaEntries(data).map(([name, quota]) =>
    normalizeQuotaEntry(name, quota, {
      displayName: quota?.displayName,
      details: Array.isArray(quota?.details) ? quota.details : undefined,
      isPercentageOnly:
        Number(quota?.total || 0) === 100 && quota?.remainingPercentage !== undefined,
    })
  );
}

function buildCreditsQuota(
  name: string,
  remaining: number,
  remainingPercentage: number,
  extra = {}
) {
  return {
    name,
    used: 0,
    total: 0,
    remaining,
    resetAt: null,
    unlimited: false,
    isCredits: true,
    remainingPercentage,
    creditCount: remaining,
    ...extra,
  };
}

function parseAntigravityQuota(modelKey: string, quota: any) {
  if (modelKey === "credits") {
    const remaining = Number(quota?.remaining ?? 0);
    return buildCreditsQuota("credits", remaining, remaining > 50 ? 100 : remaining > 10 ? 60 : 20);
  }
  if (modelKey === "models" || isUnlimitedEmpty(quota)) return null;
  return normalizeQuotaEntry(modelKey, quota, {
    modelKey,
    isPercentageOnly: quota?.fractionReported === true,
    ...(quota?.quotaSource ? { quotaSource: quota.quotaSource } : {}),
    ...(quota?.fractionReported !== undefined ? { fractionReported: quota.fractionReported } : {}),
  });
}

function parseAntigravity(data: any) {
  return quotaEntries(data)
    .map(([modelKey, quota]) => parseAntigravityQuota(modelKey, quota))
    .filter(Boolean);
}

function buildBankedResetCreditsQuota(count: number) {
  return {
    name: "banked_reset_credits",
    used: 0,
    total: 0,
    remaining: count,
    resetAt: null,
    unlimited: false,
    isResetCredits: true,
    remainingPercentage: 100,
    creditCount: count,
  };
}

function parseCodex(data: any) {
  const quotas = quotaEntries(data).map(([quotaType, quota]) =>
    normalizeQuotaEntry(quotaType, quota, {
      displayName: quota?.displayName,
      isPercentageOnly: true,
    })
  );

  const bankedResetCredits = Number(data?.bankedResetCredits);
  if (Number.isFinite(bankedResetCredits) && bankedResetCredits > 0) {
    quotas.push(buildBankedResetCreditsQuota(bankedResetCredits));
  }

  return quotas;
}

function parseGrokCli(data: any) {
  const quotas = parseGeneric(data);
  const bankedResetCredits = Number(data?.bankedResetCredits);
  if (Number.isFinite(bankedResetCredits) && bankedResetCredits > 0) {
    quotas.push(buildBankedResetCreditsQuota(bankedResetCredits));
  }
  return quotas;
}

function buildClaudeExtraUsageQuota(extraUsage: any) {
  const monthlyLimit = Number(extraUsage?.monthly_limit ?? 0);
  const usedCredits = Number(extraUsage?.used_credits ?? 0);
  const utilization = Number(extraUsage?.utilization ?? 0);
  const remainingPercentage = Number.isFinite(utilization)
    ? Math.max(0, 100 - utilization)
    : undefined;
  const remaining = Number.isFinite(monthlyLimit) ? Math.max(0, monthlyLimit - usedCredits) : 0;

  return buildCreditsQuota("extra_usage", remaining, remainingPercentage ?? 100, {
    used: Number.isFinite(usedCredits) ? usedCredits : 0,
    total: Number.isFinite(monthlyLimit) ? monthlyLimit : 0,
    currency: extraUsage?.currency,
  });
}

function parseClaude(data: any) {
  if (data?.message)
    return [{ name: "error", used: 0, total: 0, resetAt: null, message: data.message }];

  const quotas = quotaEntries(data).map(([name, quota]) =>
    normalizeQuotaEntry(name, quota, { isPercentageOnly: true })
  );

  if (data?.extraUsage?.is_enabled) {
    quotas.push(buildClaudeExtraUsageQuota(data.extraUsage));
  }

  return quotas;
}

function parseDeepseekQuota(quotaKey: string, quota: any) {
  const match = quotaKey.match(/^credits(?:_([a-z]{3}))?$/);
  if (!match) return normalizeQuotaEntry(quotaKey, quota);
  const remaining = Number(quota?.remaining ?? 0);
  const currency = quota?.currency ?? (match[1] ? match[1].toUpperCase() : "USD");
  return buildCreditsQuota(currency, remaining, remaining > 20 ? 100 : remaining > 5 ? 60 : 20, {
    currency,
  });
}

function parseDeepseek(data: any) {
  return quotaEntries(data).map(([quotaKey, quota]) => parseDeepseekQuota(quotaKey, quota));
}

function parseAgentrouterQuota(quotaKey: string, quota: any) {
  if (quotaKey !== "balance") return normalizeQuotaEntry(quotaKey, quota);
  const remaining = Math.max(0, Number(quota?.remaining ?? 0));
  const currency = quota?.currency || "USD";
  const remainingPercentage =
    safePercentage(quota?.remainingPercentage) ?? (remaining > 0 ? 100 : 0);
  return buildCreditsQuota(currency, remaining, remainingPercentage, { currency });
}

function parseAgentrouter(data: any) {
  return quotaEntries(data).map(([quotaKey, quota]) => parseAgentrouterQuota(quotaKey, quota));
}

function parseMoonshotQuota(quotaKey: string, quota: any) {
  if (quotaKey !== "balance") return normalizeQuotaEntry(quotaKey, quota);
  // Absolute CNY balance: leftover follows the bucket balance so an empty
  // account renders as ¥0.00, not a fabricated percentage bar.
  const remaining = Math.max(0, Number(quota?.remaining ?? 0));
  const currency = quota?.currency || "CNY";
  const remainingPercentage =
    safePercentage(quota?.remainingPercentage) ?? (remaining > 0 ? 100 : 0);
  return buildCreditsQuota(quotaKey, remaining, remainingPercentage, {
    currency,
    displayName: quota?.displayName,
  });
}

function parseMoonshot(data: any) {
  return quotaEntries(data).map(([quotaKey, quota]) => parseMoonshotQuota(quotaKey, quota));
}

function parseProviderQuotas(providerId: string, data: any) {
  if (providerId === "github") return parseGithub(data);
  if (["glm", "glm-cn", "glmt", "opencode-go"].includes(providerId)) return parseGlmFamily(data);
  if (providerId === "antigravity" || providerId === "agy") return parseAntigravity(data);
  if (providerId === "codex") return parseCodex(data);
  if (providerId === "grok-cli") return parseGrokCli(data);
  if (providerId === "claude") return parseClaude(data);
  if (providerId === "deepseek") return parseDeepseek(data);
  if (providerId === "agentrouter") return parseAgentrouter(data);
  if (providerId === "moonshot") return parseMoonshot(data);
  return parseGeneric(data);
}

function sortGlmOrder(providerId: string, quotas: any[]) {
  if (!GLM_FAMILY_PROVIDERS.includes(providerId)) return;
  quotas.sort((a, b) => (GLM_QUOTA_ORDER[a.name] ?? 99) - (GLM_QUOTA_ORDER[b.name] ?? 99));
}

function sortCodexOrder(providerId: string, quotas: any[]) {
  if (providerId !== "codex") return;
  quotas.sort((a, b) => (CODEX_QUOTA_ORDER[a.name] ?? 99) - (CODEX_QUOTA_ORDER[b.name] ?? 99));
}

function sortKimiOrder(providerId: string, quotas: any[]) {
  if (!KIMI_CODING_PROVIDERS.includes(providerId)) return;
  const rank = (name: string) => {
    if (/^code_5h(?:_|$)/.test(name)) return 0;
    if (/^code_7d(?:_|$)/.test(name)) return 1;
    return 99;
  };
  quotas.sort((a, b) => {
    const rankDiff = rank(String(a.name)) - rank(String(b.name));
    return rankDiff || String(a.name).localeCompare(String(b.name));
  });
}

export function parseQuotaData(provider: string | undefined, data: any): any[] {
  if (!data || typeof data !== "object") return [];
  const providerId = String(provider || "").toLowerCase();

  try {
    const normalizedQuotas = parseProviderQuotas(providerId, data);
    sortGlmOrder(providerId, normalizedQuotas);
    sortCodexOrder(providerId, normalizedQuotas);
    sortKimiOrder(providerId, normalizedQuotas);
    return normalizedQuotas;
  } catch (error) {
    console.error(`Error parsing quota data for ${provider}:`, error);
    return [];
  }
}
