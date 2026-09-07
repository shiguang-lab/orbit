export function buildClientRawRequest(request: Request, body: unknown): {
  endpoint: string;
  body: unknown;
  headers: Record<string, string>;
  signal: AbortSignal | null;
};
export function handleChat(
  request: Request,
  clientRawRequest?: (() => unknown) | null,
  parsedBody?: unknown,
  requestId?: string,
): Promise<Response>;
