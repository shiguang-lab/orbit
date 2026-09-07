export const ACCESS_SCOPES: readonly ["read", "write", "admin"];
export type AccessScope = (typeof ACCESS_SCOPES)[number];
export function isAccessScope(value: unknown): value is AccessScope;
export function scopeSatisfies(have: unknown, need: AccessScope): boolean;
export function normalizeScope(value: unknown, fallback?: AccessScope): AccessScope;
