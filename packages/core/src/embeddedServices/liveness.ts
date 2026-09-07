export interface EmbeddedServiceLiveness {
  ok: boolean;
  status: number | null;
  latencyMs: number;
}

export async function probeEmbeddedServiceLiveness(
  baseUrl: string,
  options: { path?: string; timeoutMs?: number } = {},
): Promise<EmbeddedServiceLiveness> {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${options.path ?? "/api/health"}`, {
      signal: AbortSignal.timeout(options.timeoutMs ?? 3_000),
    });
    return { ok: response.ok, status: response.status, latencyMs: Date.now() - startedAt };
  } catch {
    return { ok: false, status: null, latencyMs: Date.now() - startedAt };
  }
}
