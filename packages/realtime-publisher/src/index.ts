export interface RealtimePublisherOptions {
  url?: string;
  subscribe(listener: (event: string, payload: unknown) => void): () => void;
  headers(): Record<string, string>;
  fetch?: typeof fetch;
  onError(error: unknown): void;
}

/** A best-effort transport owned and closed by its emitting application. */
export function startRealtimePublisher(options: RealtimePublisherOptions): { close(): Promise<void> } {
  let pendingCount = 0;
  let delivery = Promise.resolve();
  let active: AbortController | undefined;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  let closed = false;
  const unsubscribe = options.url ? options.subscribe((event, payload) => {
    if (closed) return;
    if (pendingCount >= 128) return; // Bound queued telemetry while realtime is unavailable.
    pendingCount++;
    const timestamp = Date.now();
    // One asynchronous chain preserves this application's emission order.
    // Queued events receive their timeout only when they begin transmission.
    delivery = delivery.then(async () => {
      if (closed) return;
      const controller = new AbortController();
      active = controller;
      const timeout = setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetchImpl(options.url!, {
          method: "POST",
          headers: { ...options.headers(), "content-type": "application/json" },
          body: JSON.stringify({ event, payload, timestamp }),
          signal: controller.signal,
        });
        await response.body?.cancel();
        if (!response.ok) throw new Error(`Realtime event delivery returned ${response.status}`);
      } finally {
        clearTimeout(timeout);
        active = undefined;
      }
    }).catch((error) => {
      if (!closed) {
        try { options.onError(error); } catch { /* Telemetry must not break its emitter. */ }
      }
    }).finally(() => {
      pendingCount--;
    });
  }) : () => {};
  return {
    async close() {
      if (!closed) {
        closed = true;
        unsubscribe();
        active?.abort();
      }
      await delivery;
    },
  };
}
