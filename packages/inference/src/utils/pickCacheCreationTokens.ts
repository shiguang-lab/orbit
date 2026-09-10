type CacheWriteDetails = {
  cache_creation_tokens?: number;
  cache_write_tokens?: number;
};

export type CacheWriteUsageSource = {
  cache_creation_input_tokens?: number;
  cache_write_tokens?: number;
  prompt_tokens_details?: CacheWriteDetails;
  input_tokens_details?: CacheWriteDetails;
};

/** Resolve cache-creation tokens without turning an absent field into zero. */
export function pickCacheCreationTokens(
  usage: CacheWriteUsageSource | null | undefined
): number | undefined {
  if (!usage || typeof usage !== "object") return undefined;
  return (
    usage.cache_creation_input_tokens ??
    usage.prompt_tokens_details?.cache_creation_tokens ??
    usage.input_tokens_details?.cache_creation_tokens ??
    usage.prompt_tokens_details?.cache_write_tokens ??
    usage.input_tokens_details?.cache_write_tokens ??
    usage.cache_write_tokens
  );
}
