export interface CorsStatus { allowAll: boolean; allowedOrigins: string[]; }
export function getCorsStatus(): CorsStatus;
