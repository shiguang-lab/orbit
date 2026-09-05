export function POST(request: Request, context?: { params?: any }): Promise<Response>;
export function OPTIONS(request?: Request): Promise<Response>;
export function GET(request: Request): Promise<Response>;
export function elevenLabsOptionsResponse(): Response;
export function isSafeElevenLabsVoiceId(value: string): boolean;
export function proxyElevenLabsRequest(
  request: Request,
  pathname: string,
  init?: Omit<RequestInit, "headers">
): Promise<Response>;
