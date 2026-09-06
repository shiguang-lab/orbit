const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const FAILURE_THRESHOLD = 5;
type AttemptState = { count: number; firstAttemptAt: number; lockedUntil: number | null };
const attempts = new Map<string, AttemptState>();

export interface GuardDecision { allowed: boolean; retryAfterSeconds?: number }
const keyFor = (ip: string | null | undefined) => (ip || "").trim() || "__unknown__";

export function checkLoginGuard(ip: string | null | undefined, options: { enabled: boolean }): GuardDecision {
  if (!options.enabled) return { allowed: true };
  const state = attempts.get(keyFor(ip));
  if (!state) return { allowed: true };
  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) return { allowed: false, retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000) };
  return { allowed: true };
}

export function recordLoginFailure(ip: string | null | undefined, options: { enabled: boolean }): GuardDecision {
  if (!options.enabled) return { allowed: true };
  const key = keyFor(ip); const now = Date.now(); const existing = attempts.get(key);
  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) { attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null }); return { allowed: true }; }
  const count = existing.count + 1;
  if (count >= FAILURE_THRESHOLD) { attempts.set(key, { count, firstAttemptAt: existing.firstAttemptAt, lockedUntil: now + LOCKOUT_MS }); return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) }; }
  attempts.set(key, { count, firstAttemptAt: existing.firstAttemptAt, lockedUntil: null }); return { allowed: true };
}

export function clearLoginAttempts(ip: string | null | undefined): void { attempts.delete(keyFor(ip)); }
