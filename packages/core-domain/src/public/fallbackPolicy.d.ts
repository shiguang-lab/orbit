export interface FallbackEntry {
  provider: string;
  priority?: number;
  enabled?: boolean;
}
export declare function getAllFallbackChains(): Record<string, FallbackEntry[]>;
export declare function registerFallback(model: string, chain: FallbackEntry[]): void;
export declare function removeFallback(model: string): boolean;
