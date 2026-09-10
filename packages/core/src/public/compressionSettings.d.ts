import type {
  CompressionConfig,
  McpAccessibilityConfig,
} from "@orbit/contracts/compression-settings";

export type CompressionSettings = CompressionConfig;

export function getCompressionSettings(): Promise<CompressionConfig>;
export function updateCompressionSettings(
  updates: Partial<CompressionConfig>,
): Promise<CompressionConfig>;
export const PROACTIVE_COMPRESSION_DEFAULT_RATIO: number;
export function getProactiveCompressionRatio(): number;
export function getMcpAccessibilityConfig(): Promise<McpAccessibilityConfig>;
export function setMcpAccessibilityConfig(value: Partial<McpAccessibilityConfig>): Promise<void>;
