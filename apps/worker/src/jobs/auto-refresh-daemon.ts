import { autoRefreshDaemon } from "@shiguang-gateway/open-sse/services/auto-refresh-daemon";

export function startAutoRefreshDaemon(): void {
  autoRefreshDaemon.start();
}

export function stopAutoRefreshDaemon(): void {
  autoRefreshDaemon.stop();
}
