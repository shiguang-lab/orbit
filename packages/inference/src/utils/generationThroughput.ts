export function generationDurationMs(totalMs: number, ttftMs: number | null | undefined): number | null {
  if (!Number.isFinite(totalMs) || totalMs <= 0 || ttftMs == null || !Number.isFinite(ttftMs) || ttftMs < 0) return null;
  const value = totalMs - ttftMs;
  return value > 0 ? value : null;
}
export function attachTokensPerSecond<T>(usage: T, generationMs: number | null | undefined): T {
  if (!usage || typeof usage !== "object" || Array.isArray(usage) || !generationMs || generationMs <= 0) return usage;
  const row = usage as Record<string, unknown>;
  const raw = row.completion_tokens ?? row.output_tokens ?? row.candidatesTokenCount ?? row.outputTokens ?? row.completionTokens;
  const output = Number(raw);
  if (!Number.isFinite(output) || output <= 0) return usage;
  return { ...row, tokens_per_second: Number((output / (generationMs / 1000)).toFixed(3)) } as T;
}
