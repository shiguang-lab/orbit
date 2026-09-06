export const ACCOUNT_DEACTIVATED_SIGNALS = [
  "account_deactivated",
  "account has been deactivated",
  "account has been disabled",
  "your account has been suspended",
  "this account is deactivated",
  "verify your account to continue",
  "this service has been disabled in this account for violation",
  "this service has been disabled in this account",
];

let customBannedSignals: string[] = [];

export function setCustomBannedSignals(signals: string[]): void {
  customBannedSignals = signals;
}

export function getMergedBannedSignals(): string[] {
  return customBannedSignals.length === 0
    ? ACCOUNT_DEACTIVATED_SIGNALS
    : [...ACCOUNT_DEACTIVATED_SIGNALS, ...customBannedSignals];
}

export const CREDITS_EXHAUSTED_SIGNALS = [
  "insufficient_quota",
  "billing_hard_limit_reached",
  "exceeded your current quota",
  "exceeded your current usage quota",
  "credit_balance_too_low",
  "your credit balance is too low",
  "credits exhausted",
  "out of credits",
  "payment required",
  "free tier of the model has been exhausted",
  "tier has been exhausted",
  "insufficient balance",
  "insufficient_balance",
  "insufficient account balance",
  "insufficient credit balance",
  "insufficient credits",
  "insufficient credit",
];

export const OAUTH_INVALID_TOKEN_SIGNALS = [
  "invalid authentication credentials",
  "oauth 2",
  "login cookie",
  "valid authentication credential",
  "invalid credentials",
];

export function isAccountDeactivated(errorText: string): boolean {
  const lower = String(errorText || "").toLowerCase();
  return getMergedBannedSignals().some((signal) => lower.includes(signal));
}

export function isCreditsExhausted(errorText: string): boolean {
  const lower = String(errorText || "").toLowerCase();
  return CREDITS_EXHAUSTED_SIGNALS.some((signal) => lower.includes(signal));
}

export function isOAuthInvalidToken(errorText: string): boolean {
  const lower = String(errorText || "").toLowerCase();
  return OAUTH_INVALID_TOKEN_SIGNALS.some((signal) => lower.includes(signal));
}

export function isDailyQuotaExhausted(errorText: string): boolean {
  if (!errorText) return false;
  const lower = errorText.toLowerCase();
  return (
    lower.includes("today's quota") ||
    lower.includes("daily quota") ||
    lower.includes("try again tomorrow")
  );
}

export function isSubscriptionQuotaText(lower: string, provider?: string | null): boolean {
  return (
    lower.includes("usage limit reached") ||
    lower.includes("usage limit has been") ||
    lower.includes("claude pro usage limit") ||
    lower.includes("you've reached your usage limit") ||
    lower.includes("you have reached your usage limit") ||
    (provider === "claude" && lower.includes("this request would exceed your account's rate limit"))
  );
}
