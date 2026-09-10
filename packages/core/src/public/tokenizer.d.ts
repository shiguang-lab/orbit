export type TokenizerEncoding = "cl100k_base" | "o200k_base";

export interface TokenizerContext {
  provider?: string | null;
  model?: string | null;
}

export const MAX_EXACT_TOKEN_COUNT_CHARS: number;

export function countTextTokens(text: string, context?: TokenizerContext): number;
export function tokenizerContextFromBody(body: unknown): TokenizerContext;
export function isCodexTokenizerContext(context?: TokenizerContext): boolean;
export function resolveTokenizerEncoding(context?: TokenizerContext): TokenizerEncoding;
