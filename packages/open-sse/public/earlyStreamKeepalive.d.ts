export type EarlyStreamKeepaliveOptions = {
  thresholdMs?: number;
  intervalMs?: number;
  signal?: AbortSignal | null;
  keepaliveFrame?: Uint8Array;
  startupFrame?: Uint8Array;
  applicationKeepalive?: { frame: Uint8Array; intervalMs: number };
  extraHeaders?: Record<string, string>;
  errorFrame?: Uint8Array;
  correlationId?: string;
};

export const ANTHROPIC_PING_FRAME: Uint8Array;
export const OPENAI_KEEPALIVE_FRAME: Uint8Array;
export const OPENAI_STARTUP_FRAME: Uint8Array;
export const OPENAI_CHAT_ERROR_FRAME: Uint8Array;
export const OPENAI_RESPONSES_ERROR_FRAME: Uint8Array;
export function withEarlyStreamKeepalive(
  handlerPromise: Promise<Response>,
  options?: EarlyStreamKeepaliveOptions,
): Promise<Response>;
