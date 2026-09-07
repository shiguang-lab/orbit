import { autoRefreshDaemon } from "@orbit/inference/services/auto-refresh-daemon";

export function startAutoRefreshDaemon(): void {
  autoRefreshDaemon.start();
}

export function stopAutoRefreshDaemon(): void {
  autoRefreshDaemon.stop();
}
