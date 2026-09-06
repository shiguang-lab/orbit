import type {
  CompressionConfig,
  McpAccessibilityConfig,
} from "@shiguang-gateway/contracts/compression-settings";

export type CompressionSettings = CompressionConfig;

export function getCompressionSettings(): Promise<CompressionConfig>;
export function updateCompressionSettings(
  updates: Partial<CompressionConfig>,
): Promise<CompressionConfig>;
export function getMcpAccessibilityConfig(): Promise<McpAccessibilityConfig>;
export function setMcpAccessibilityConfig(value: Partial<McpAccessibilityConfig>): Promise<void>;
