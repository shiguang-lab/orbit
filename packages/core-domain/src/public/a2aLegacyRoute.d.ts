/** Transitional A2A route contract consumed by apps/edge-gateway. */
export type A2ARouteContext = { params: Record<string, string> };

export function GET(request: Request, context?: A2ARouteContext): Promise<Response>;
export function POST(request: Request, context?: A2ARouteContext): Promise<Response>;
export function OPTIONS(request?: Request): Promise<Response> | Response;
