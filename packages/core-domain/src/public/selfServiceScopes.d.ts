export function hasSelfUsageScope(scopes: readonly string[] | null | undefined): boolean;
export function hasSelfAccountQuotaScope(scopes: readonly string[] | null | undefined): boolean;
export function normalizeSelfServiceScopesForCreate(scopes: unknown): string[];
