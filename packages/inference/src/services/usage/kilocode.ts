import type { UsageQuota } from "./quota.ts";
import { parseResetTime } from "./quota.ts";

const KILO_API_BASE = process.env.KILO_API_URL || "https://api.kilo.ai";
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, "X-KILOCODE-EDITORNAME": "Orbit", Accept: "application/json" });
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const amount = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

export function parseKilocodeBalance(value: unknown): number | null {
  const balance = Number(record(value).balance);
  return Number.isFinite(balance) && balance >= 0 ? Math.round(balance * 100) / 100 : null;
}

export function parseKiloPassState(value: unknown) {
  const item = Array.isArray(value) ? value[0] : value;
  const data = record(record(record(item).result).data);
  const root = Object.keys(record(data.json)).length ? record(data.json) : Object.keys(data).length ? data : record(value);
  const subscription = record(root.subscription);
  if (subscription.currentPeriodBaseCreditsUsd == null && subscription.currentPeriodUsageUsd == null) return null;
  if (typeof subscription.status === "string" && !["active", "past_due", "trialing"].includes(subscription.status)) return null;
  return {
    base: amount(subscription.currentPeriodBaseCreditsUsd),
    bonus: amount(subscription.currentPeriodBonusCreditsUsd),
    used: amount(subscription.currentPeriodUsageUsd),
    resetAt: parseResetTime(subscription.nextBillingAt ?? subscription.nextRenewalAt),
  };
}

export async function getKilocodeUsage(connection: Record<string, unknown>) {
  const token = typeof connection.accessToken === "string" ? connection.accessToken.trim() : "";
  if (!token || token === "anonymous") return { message: "Kilo Code account token not available." };
  const opts = { headers: headers(token), signal: AbortSignal.timeout(8000) };
  const [balanceResult, passResult] = await Promise.allSettled([
    fetch(`${KILO_API_BASE}/api/profile/balance`, opts).then(async (r) => r.ok ? parseKilocodeBalance(await r.json()) : null),
    fetch(`${KILO_API_BASE}/api/trpc/kiloPass.getState?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": null }))}`, opts).then(async (r) => r.ok ? parseKiloPassState(await r.json()) : null),
  ]);
  const balance = balanceResult.status === "fulfilled" ? balanceResult.value : null;
  const pass = passResult.status === "fulfilled" ? passResult.value : null;
  const quotas: Record<string, UsageQuota> = {};
  if (balance !== null) quotas.balance = { used: 0, total: 0, remaining: balance, remainingPercentage: balance > 0 ? 100 : 0, resetAt: null, unlimited: true, currency: "USD", displayName: "Balance (USD)" };
  if (pass) {
    const total = pass.base + pass.bonus;
    const remaining = Math.max(0, total - pass.used);
    quotas.kiloPass = { used: pass.used, total, remaining, remainingPercentage: total > 0 ? remaining / total * 100 : 0, resetAt: pass.resetAt, unlimited: false, currency: "USD", displayName: "Kilo Pass" };
  }
  return Object.keys(quotas).length ? { plan: "Kilo Code", quotas } : { message: "Kilo Code usage endpoints unavailable." };
}
