export function isAuthenticated(request: Request): Promise<boolean>;
export function isAuthRequired(request?: Request): Promise<boolean>;
export function isDashboardSessionAuthenticated(request?: Request): Promise<boolean>;
