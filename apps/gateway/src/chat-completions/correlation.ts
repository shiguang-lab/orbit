/** Preserve a safe caller correlation id; invalid input falls back to generation. */
export function resolveIncomingCorrelationId(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().replace(/[\r\n]/g, "");
  return normalized.length > 0 && normalized.length <= 256 ? normalized : null;
}
