export interface GuardDecision { allowed: boolean; retryAfterSeconds?: number; }
export function checkLoginGuard(rawIp: string | null | undefined, options: { enabled: boolean }): GuardDecision;
export function recordLoginFailure(rawIp: string | null | undefined, options: { enabled: boolean }): GuardDecision;
export function clearLoginAttempts(rawIp: string | null | undefined): void;
