export type FailureKind = "rate_limit" | "quota_exhausted" | "transient";
export type CircuitState = "CLOSED" | "DEGRADED" | "OPEN" | "HALF_OPEN";

export interface FailureKindThresholds {
  threshold: number;
  cooldown?: number;
  immediateOpen?: boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
  onStateChange?: ((name: string, oldState: string, newState: string) => void) | null;
  isFailure?: (error: unknown) => boolean;
  cooldownByKind?: Partial<Record<FailureKind, number>>;
  classifyError?: (error: unknown) => FailureKind | undefined;
  kindThresholds?: Partial<Record<FailureKind, Partial<FailureKindThresholds>>>;
  degradationThreshold?: number;
  maxBackoffMultiplier?: number;
  backoffEscalationCount?: number;
}

export interface TransitionRecord {
  from: string;
  to: string;
  timestamp: number;
  failureCount: number;
  reason?: string;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  retryAfterMs: number;
  lastFailureKind: FailureKind | null;
  openCycleCount: number;
  kindFailureCounts: Record<string, number>;
  degradationThreshold: number;
  effectiveResetTimeout: number;
  transitionHistory: TransitionRecord[];
}

export interface CircuitBreakerHandle {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  canExecute(): boolean;
  getStatus(): CircuitBreakerStatus;
  getRetryAfterMs(): number;
  reset(): void;
  _onSuccess(): void;
  _onFailure(kind?: FailureKind | null): void;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string, circuitName: string, retryAfterMs: number);
  circuitName: string;
  retryAfterMs: number;
}

export function isLocalExecutionError(error: unknown): boolean;
export function isLocalStreamLifecycleError(error: unknown): boolean;
export function isModelCapacityOverloadError(error: unknown): boolean;
export function getAllCircuitBreakerStatuses(): CircuitBreakerStatus[];
export function getCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions,
): CircuitBreakerHandle;
export function resetAllCircuitBreakers(): void;
