import type { RuntimeHealthPayload } from "@/entities/api";

export type RuntimeQuotaMonitor = RuntimeHealthPayload["quotaMonitor"]["monitors"][number];

export function partitionQuotaMonitors(monitors: RuntimeQuotaMonitor[]) {
  return {
    exhausted: monitors.filter((monitor) => monitor.status === "exhausted"),
    alerting: monitors.filter((monitor) => monitor.status === "alerting"),
    errors: monitors.filter((monitor) => monitor.status === "error"),
  };
}
