import { autoRefreshDaemon } from "@shiguang-gateway/open-sse/services/autoRefreshDaemon.ts";

export function startAutoRefreshDaemon(): void {
  autoRefreshDaemon.start();
}

export function stopAutoRefreshDaemon(): void {
  autoRefreshDaemon.stop();
}
