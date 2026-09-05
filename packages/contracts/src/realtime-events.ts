/** Public event vocabulary consumed by realtime projections. */
export type DashboardEventName =
  | "request.started"
  | "request.streaming"
  | "request.completed"
  | "request.failed"
  | "combo.target.attempt"
  | "combo.target.failed"
  | "combo.target.succeeded"
  | "credential.health.changed"
  | "compression.completed"
  | "compression.step";
export type DashboardEventMap = Record<string, unknown>;
export type DashboardChannel = "requests" | "combo" | "credentials" | "compression";

export const CHANNEL_EVENTS: Record<DashboardChannel, DashboardEventName[]> = {
  requests: ["request.started", "request.streaming", "request.completed", "request.failed"],
  combo: ["combo.target.attempt", "combo.target.failed", "combo.target.succeeded"],
  credentials: ["credential.health.changed"],
  compression: ["compression.completed", "compression.step"],
};

export function getChannelForEvent(event: DashboardEventName): DashboardChannel | undefined {
  for (const [channel, events] of Object.entries(CHANNEL_EVENTS)) {
    if (events.includes(event)) return channel as DashboardChannel;
  }
  return undefined;
}
