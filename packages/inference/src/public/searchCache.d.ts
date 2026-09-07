export function computeCacheKey(query: string, provider: string, searchType: string, maxResults: number, country?: string, language?: string, filters?: unknown): string;
export function getOrCoalesce<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<{ data: T; cached: boolean }>;
export function getCacheStats(): { size: number; hits: number; misses: number };
export const SEARCH_CACHE_DEFAULT_TTL_MS: number;
