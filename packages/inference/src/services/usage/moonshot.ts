import type { UsageQuota } from "./quota.ts";

const allowedHosts = new Set(["api.moonshot.cn", "api.moonshot.ai"]);
export function resolveMoonshotOrigin(connection: Record<string, unknown>): string | null {
  const data = connection.providerSpecificData && typeof connection.providerSpecificData === "object" ? connection.providerSpecificData as Record<string, unknown> : {};
  const raw = typeof data.baseUrl === "string" ? data.baseUrl : "https://api.moonshot.ai";
  try { const url = new URL(raw); return allowedHosts.has(url.hostname.toLowerCase()) ? `${url.protocol}//${url.host}` : null; } catch { return null; }
}
export async function getMoonshotUsage(connection: Record<string, unknown>) {
  const apiKey = typeof connection.apiKey === "string" ? connection.apiKey : "";
  const origin = resolveMoonshotOrigin(connection);
  if (!apiKey || !origin) return { message: "Moonshot Open Platform key/base URL not available." };
  try {
    const response = await fetch(`${origin}/v1/users/me/balance`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { message: `Moonshot balance request failed (${response.status})` };
    const json = await response.json() as Record<string, unknown>;
    const data = json.data && typeof json.data === "object" ? json.data as Record<string, unknown> : json;
    const available = Number(data.available_balance ?? data.availableBalance ?? data.balance);
    if (!Number.isFinite(available)) return { message: "Moonshot balance response did not include available balance." };
    // Absolute CNY balance bucket: leftover follows the balance, never a fake
    // percentage, and `unlimited` is false so the dashboard renders credits (¥).
    const balance: UsageQuota = { used: 0, total: 0, remaining: available, remainingPercentage: available > 0 ? 100 : 0, resetAt: null, unlimited: false, currency: "CNY", displayName: "Available Balance" };
    return { plan: "Moonshot Open Platform", quotas: { balance } };
  } catch (error) { return { message: `Moonshot balance error: ${error instanceof Error ? error.message : String(error)}` }; }
}
