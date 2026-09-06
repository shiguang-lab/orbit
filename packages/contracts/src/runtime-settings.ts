export type ConfiguredErrorReason =
  | "auth_error"
  | "quota_exhausted"
  | "rate_limit_exceeded"
  | "model_capacity"
  | "server_error"
  | "unknown";

export interface OperatorProviderErrorRule {
  status: number;
  match: string;
  scope: "model" | "provider" | "connection";
  reason?: ConfiguredErrorReason;
  cooldownMs?: number;
}

export function storedInstantToEpochMs(
  value: string | number | Date | null | undefined,
): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const raw = value.trim();
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return new Date(raw).getTime();
}
