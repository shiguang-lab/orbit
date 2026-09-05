export interface ErrorBodyClassification { type?: string; code?: string; reason?: string; }
export function sanitizeErrorMessage(message: unknown): string;
export function buildErrorBody(statusCode: number, message: string, upstreamDetails?: unknown, classification?: ErrorBodyClassification): { error: { message: string; type?: string; code?: string; reason?: string }; upstream_details?: Record<string, unknown> | null };
