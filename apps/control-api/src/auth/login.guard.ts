const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const FAILURE_THRESHOLD = 5;
const PRUNE_THRESHOLD = 256;

interface AttemptState {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, AttemptState>();

export interface GuardDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

function clientKey(rawIp: string | null | undefined): string {
  const ip = (rawIp || "").trim();
  return ip || "__unknown__";
}

function pruneExpiredAttempts(now: number): void {
  for (const [key, state] of attempts) {
    const windowElapsed = now - state.firstAttemptAt > WINDOW_MS;
    const notLocked = !state.lockedUntil || state.lockedUntil <= now;
    if (windowElapsed && notLocked) attempts.delete(key);
  }
}

export function checkLoginGuard(
  rawIp: string | null | undefined,
  options: { enabled: boolean }
): GuardDecision {
  if (!options.enabled) return { allowed: true };
  const state = attempts.get(clientKey(rawIp));
  if (!state) return { allowed: true };
  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordLoginFailure(
  rawIp: string | null | undefined,
  options: { enabled: boolean }
): GuardDecision {
  if (!options.enabled) return { allowed: true };
  const key = clientKey(rawIp);
  const now = Date.now();

  if (attempts.size > PRUNE_THRESHOLD) pruneExpiredAttempts(now);

  const existing = attempts.get(key);
  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return { allowed: true };
  }

  const nextCount = existing.count + 1;
  if (nextCount >= FAILURE_THRESHOLD) {
    attempts.set(key, {
      count: nextCount,
      firstAttemptAt: existing.firstAttemptAt,
      lockedUntil: now + LOCKOUT_MS,
    });
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  attempts.set(key, {
    count: nextCount,
    firstAttemptAt: existing.firstAttemptAt,
    lockedUntil: null,
  });
  return { allowed: true };
}

export function clearLoginAttempts(rawIp: string | null | undefined): void {
  attempts.delete(clientKey(rawIp));
}

export function resetLoginGuardForTests(): void {
  attempts.clear();
}

export function getLoginGuardSizeForTests(): number {
  return attempts.size;
}

export const LOGIN_GUARD_TUNABLES = Object.freeze({
  WINDOW_MS,
  LOCKOUT_MS,
  FAILURE_THRESHOLD,
});
