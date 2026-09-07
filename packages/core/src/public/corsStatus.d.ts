export interface CorsStatus { allowAll: boolean; allowedOrigins: string[]; }
export function getCorsStatus(): CorsStatus;
export function resolveAllowedOrigin(origin: string | null | undefined): string | null;
