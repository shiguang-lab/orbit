export interface RuntimeLogger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
}

export interface CompressionConfig extends Record<string, unknown> {
  compressionComboId?: string | null;
}

export interface CompressionResult {
  compressed: boolean;
  body: Record<string, unknown>;
  stats?: Record<string, unknown> | null;
}

export interface CompressionBodyAdapter {
  adapted: boolean;
  body: Record<string, unknown>;
  restore(body: Record<string, unknown>): Record<string, unknown>;
}

export class CodexExecutor {
  transformRequest(
    model: string,
    body: Record<string, unknown>,
    stream: boolean,
    credentials: Record<string, unknown>,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  buildHeaders(credentials: Record<string, unknown>, stream?: boolean): Record<string, string>;
}

export function sanitizeErrorMessage(error: unknown, options?: Record<string, unknown>): string;
export function logger(scope: string): RuntimeLogger;
export function resolveProxy(providerId: string): Promise<unknown>;
export function proxyConfigToUrl(proxyConfig: unknown): string | null;
export function withCodexFingerprintCredentials<T extends Record<string, unknown>>(
  credentials: T,
  clientHeaders?: Headers | Record<string, unknown> | null,
  body?: unknown,
): T;
export function estimateTokens(value: unknown): number;
export function adaptBodyForCompression(body: Record<string, unknown>): CompressionBodyAdapter;
export function resolveOmniGlyphTransport(provider: string | null | undefined): Record<string, unknown>;
export function resolveCompressionSettings(log?: {
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}): Promise<{ settings: CompressionConfig | null; enabled: boolean }>;
export function selectCompressionStrategy(
  config: CompressionConfig,
  comboId: string | null,
  estimatedTokens: number,
  body?: Record<string, unknown>,
  context?: Record<string, unknown>,
  combos?: Record<string, unknown>,
  header?: string | null,
): string;
export function applyCompressionAsync(
  body: Record<string, unknown>,
  mode: string,
  options?: Record<string, unknown>,
): Promise<CompressionResult>;
export function writeCompressionSkip(options: Record<string, unknown>, reason: string): Promise<void>;
export function writeCompressionAnalytics(options: Record<string, unknown>): Promise<void>;
