export interface EmbeddingHandlerOptions {
  clientRawRequest?: {
    endpoint: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  };
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  connectionId?: string | null;
  resolvedProvider?: unknown;
  resolvedModel?: string | null;
}
export function createEmbeddingResponse(
  body: Record<string, unknown> & { model: string },
  options?: EmbeddingHandlerOptions,
): Promise<Response>;

