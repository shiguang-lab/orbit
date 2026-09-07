export interface RoutingQuality {
  [key: string]: unknown;
}
export interface RoutingEvent {
  [key: string]: unknown;
}
export function initRoutingObservability(env?: NodeJS.ProcessEnv): {
  sinks: string[];
  otelEnabled: boolean;
};
export function recentRoutingEvents(limit?: number): RoutingEvent[];
export function routingQualitySnapshot(limit?: number): RoutingQuality[];
export function classifyQuality(value: RoutingQuality): unknown;
export function routingOtelStats(): { buffered: number; dropped: number } | null;
