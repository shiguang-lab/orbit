export interface RealtimePublisherOptions {
  url?: string;
  subscribe(listener: (event: string, payload: unknown) => void): () => void;
  headers(): Record<string, string>;
  fetch?: typeof fetch;
  onError(error: unknown): void;
}

/** A best-effort transport owned and closed by its emitting application. */
export function startRealtimePublisher(options: RealtimePublisherOptions): { close(): Promise<void> } {
  const pending = new Map<AbortController, Promise<void>>();
  const fetchImpl = options.fetch ?? globalThis.fetch;
  let closed = false;
  const unsubscribe = options.url ? options.subscribe((event, payload) => {
    if (closed) return;
    if (pending.size >= 128) return; // Bound telemetry work when realtime is unavailable.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const delivery = Promise.resolve().then(async () => {
      const response = await fetchImpl(options.url!, {
        method: "POST",
        headers: { ...options.headers(), "content-type": "application/json" },
        body: JSON.stringify({ event, payload, timestamp: Date.now() }),
        signal: controller.signal,
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`Realtime event delivery returned ${response.status}`);
    }).catch((error) => {
      if (!closed) {
        try { options.onError(error); } catch { /* Telemetry must not break its emitter. */ }
      }
    }).finally(() => {
      clearTimeout(timeout);
      pending.delete(controller);
    });
    pending.set(controller, delivery);
  }) : () => {};
  return {
    async close() {
      if (!closed) {
        closed = true;
        unsubscribe();
        for (const controller of pending.keys()) controller.abort();
      }
      await Promise.allSettled(pending.values());
    },
  };
}
