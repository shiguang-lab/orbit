export function isAuthzRoute(request: Request): boolean;
export function requireAuthzRoute(request: Request): Promise<Response | null>;
