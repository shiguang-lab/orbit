export type ExpiryType = "oauth_token" | "subscription" | "api_credits" | "free_tier_reset";

export type ExpiryStatus = "active" | "expiring_soon" | "expired" | "unknown";

export interface ProviderExpiration {
  connectionId: string;
  provider: string;
  connectionName: string;
  expiresAt: string | null;
  expiryType: ExpiryType;
  alertDays: number;
  lastChecked: string;
  status: ExpiryStatus;
  note: string | null;
}

export interface ExpirationSummary {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  unknown: number;
  nextExpiration: ProviderExpiration | null;
}

const expirations = new Map<string, ProviderExpiration>();

function calculateStatus(expiresAt: string | null, alertDays: number): ExpiryStatus {
  if (!expiresAt) return "unknown";

  const now = new Date();
  const expiry = new Date(expiresAt);

  if (isNaN(expiry.getTime())) return "unknown";
  if (expiry <= now) return "expired";

  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry <= alertDays) return "expiring_soon";

  return "active";
}

export function setExpiration(
  connectionId: string,
  provider: string,
  connectionName: string,
  expiresAt: string | null,
  expiryType: ExpiryType,
  options?: { alertDays?: number; note?: string | null }
): ProviderExpiration {
  const alertDays = options?.alertDays ?? 7;
  const status = calculateStatus(expiresAt, alertDays);

  const entry: ProviderExpiration = {
    connectionId,
    provider,
    connectionName,
    expiresAt,
    expiryType,
    alertDays,
    lastChecked: new Date().toISOString(),
    status,
    note: options?.note ?? null,
  };

  expirations.set(connectionId, entry);
  return entry;
}

export function getExpiration(connectionId: string): ProviderExpiration | null {
  const entry = expirations.get(connectionId);
  if (!entry) return null;
  entry.status = calculateStatus(entry.expiresAt, entry.alertDays);
  return entry;
}

export function getAllExpirations(): ProviderExpiration[] {
  const result: ProviderExpiration[] = [];
  for (const entry of expirations.values()) {
    entry.status = calculateStatus(entry.expiresAt, entry.alertDays);
    result.push(entry);
  }
  return result.sort((a, b) => {
    const order: Record<ExpiryStatus, number> = {
      expired: 0,
      expiring_soon: 1,
      active: 2,
      unknown: 3,
    };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });
}

export function getExpiringSoon(): ProviderExpiration[] {
  return getAllExpirations().filter(
    (entry) => entry.status === "expired" || entry.status === "expiring_soon"
  );
}

export function getExpirationSummary(): ExpirationSummary {
  const all = getAllExpirations();
  const summary: ExpirationSummary = {
    total: all.length,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    unknown: 0,
    nextExpiration: null,
  };
  let nearestMs = Infinity;

  for (const entry of all) {
    switch (entry.status) {
      case "active":
        summary.active++;
        break;
      case "expiring_soon":
        summary.expiringSoon++;
        break;
      case "expired":
        summary.expired++;
        break;
      case "unknown":
        summary.unknown++;
        break;
    }

    if (entry.expiresAt) {
      const ms = new Date(entry.expiresAt).getTime() - Date.now();
      if (ms > 0 && ms < nearestMs) {
        nearestMs = ms;
        summary.nextExpiration = entry;
      }
    }
  }

  return summary;
}

export function removeExpiration(connectionId: string): boolean {
  return expirations.delete(connectionId);
}

export function detectExpirationFromResponse(
  provider: string,
  status: number,
  headers: Record<string, string>
): { expiresAt: string; expiryType: ExpiryType } | null {
  if (status === 401) {
    return { expiresAt: new Date().toISOString(), expiryType: "oauth_token" };
  }
  if (status === 402) {
    return { expiresAt: new Date().toISOString(), expiryType: "subscription" };
  }

  const resetHeader =
    headers["x-ratelimit-reset"] || headers["x-ratelimit-reset-tokens"] || headers["retry-after"];
  if (resetHeader && status === 429) {
    const resetTime = parseInt(resetHeader, 10);
    if (!isNaN(resetTime)) {
      const date = resetTime > 1_000_000_000
        ? new Date(resetTime * 1000)
        : new Date(Date.now() + resetTime * 1000);
      return { expiresAt: date.toISOString(), expiryType: "free_tier_reset" };
    }
  }

  return null;
}

export function resetExpirations(): void {
  expirations.clear();
}
