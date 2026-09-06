export interface TransitionRecord { from: string; to: string; timestamp: number; failureCount: number; reason?: string; }
export interface CircuitBreakerStatus {
  name: string; state: string; failureCount: number; retryAfterMs: number;
  lastFailureKind: string | null; transitionHistory?: TransitionRecord[];
}
export interface CircuitBreakerLike { reset(): void; }
export function getAllCircuitBreakerStatuses(): CircuitBreakerStatus[];
export function getCircuitBreaker(name: string): CircuitBreakerLike;
export function resetAllCircuitBreakers(): void;
