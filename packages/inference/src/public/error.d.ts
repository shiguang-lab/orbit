export interface ErrorBodyClassification { type?: string; code?: string; reason?: string; }
export function sanitizeErrorMessage(message: unknown): string;
export function buildErrorBody(statusCode: number, message: string, upstreamDetails?: unknown, classification?: ErrorBodyClassification): { error: { message: string; type?: string; code?: string; reason?: string }; upstream_details?: Record<string, unknown> | null };
export function errorResponse(statusCode: number, message: string, classification?: ErrorBodyClassification): Response;
export function unavailableResponse(statusCode: number, message: string, retryAfter?: string | number | Date | null, retryAfterHuman?: string): Response;
export function parseUpstreamError(response: Response, provider?: string | null): Promise<{ statusCode: number; message: string; responseBody?: unknown; retryAfterMs?: number }>;
