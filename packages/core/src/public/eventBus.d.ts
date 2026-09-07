export interface HistoryEntry {
  event: string;
  payload: unknown;
  timestamp: number;
}
export function getEventHistory(sinceTimestamp?: number, maxEntries?: number): HistoryEntry[];
export function emit(event: string, payload: unknown): void;
export function on(event: string, listener: (payload: unknown) => void): () => void;
export function onAny(listener: (event: string, payload: unknown) => void): () => void;
export function initEventBus(): void;
