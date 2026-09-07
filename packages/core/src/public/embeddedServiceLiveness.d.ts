export interface EmbeddedServiceLiveness {
  ok: boolean;
  status: number | null;
  latencyMs: number;
}
export function probeEmbeddedServiceLiveness(
  baseUrl: string,
  options?: { path?: string; timeoutMs?: number },
): Promise<EmbeddedServiceLiveness>;
