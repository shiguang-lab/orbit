/** Public control-plane contract for persisted compression settings. */
export type CompressionSettings = Record<string, unknown>;

export function getCompressionSettings(): Promise<CompressionSettings>;
export function updateCompressionSettings(
  updates: Record<string, unknown>,
): Promise<CompressionSettings>;
export function getMcpAccessibilityConfig(): Promise<CompressionSettings>;
export function setMcpAccessibilityConfig(value: Record<string, unknown>): Promise<void>;
