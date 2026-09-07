import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { getCachedProviderNodes } from "@orbit/core/db/read-cache";

export interface LocalProviderHealthStatus {
  nodeId: string;
  prefix: string;
  isHealthy: boolean;
  lastCheck: Date;
  lastError?: string;
  consecutiveFailures: number;
  responseTimeMs?: number;
}

const BACKOFF_SCHEDULE = [30_000, 60_000, 120_000, 300_000];
const INITIAL_DELAY_MS = 15_000;
const CHECK_TIMEOUT_MS = 5_000;

export function isLocalProviderUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    if (url.username || url.password) return false;
    return url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]" ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Edge lifecycle owner for polling provider nodes reachable from the request-plane network. */
@Injectable()
export class LocalProviderHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly statuses = new Map<string, LocalProviderHealthStatus>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sweeping = false;
  private stopped = true;

  onModuleInit(): void {
    if (process.env.SHIGUANG_GATEWAY_DISABLE_LOCAL_HEALTHCHECK || process.env.NODE_ENV === "test") return;
    this.stopped = false;
    this.timer = setTimeout(() => void this.sweep(), INITIAL_DELAY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  getAllHealthStatuses(): Record<string, LocalProviderHealthStatus> {
    return Object.fromEntries(this.statuses);
  }

  private scheduleNext(): void {
    if (this.stopped) return;
    const failures = Math.max(0, ...[...this.statuses.values()].map((status) => status.consecutiveFailures));
    const delay = BACKOFF_SCHEDULE[Math.min(failures, BACKOFF_SCHEDULE.length - 1)];
    this.timer = setTimeout(() => void this.sweep(), delay);
    this.timer.unref?.();
  }

  private async sweep(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const candidates = await getCachedProviderNodes() as Array<Record<string, unknown> | null>;
      const nodes = candidates.filter((node): node is { id: string; prefix: string; baseUrl: string } =>
        node !== null && typeof node.id === "string" && typeof node.prefix === "string" &&
        typeof node.baseUrl === "string" && isLocalProviderUrl(node.baseUrl)
      );
      const activeIds = new Set(nodes.map((node) => node.id));
      for (const id of this.statuses.keys()) if (!activeIds.has(id)) this.statuses.delete(id);
      const results = await Promise.allSettled(nodes.map((node) => this.checkNode(node)));
      for (const result of results) {
        if (result.status === "fulfilled") this.statuses.set(result.value.nodeId, result.value);
      }
    } catch (error) {
      console.error("[LocalProviderHealth] sweep failed:", error);
    } finally {
      this.sweeping = false;
      this.scheduleNext();
    }
  }

  private async checkNode(node: { id: string; prefix: string; baseUrl: string }): Promise<LocalProviderHealthStatus> {
    const startedAt = Date.now();
    const previousFailures = this.statuses.get(node.id)?.consecutiveFailures ?? 0;
    try {
      const response = await fetch(`${node.baseUrl.replace(/\/+$/, "")}/models`, {
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      void response.body?.cancel();
      const isHealthy = response.ok || response.status === 401;
      return {
        nodeId: node.id,
        prefix: node.prefix,
        isHealthy,
        lastCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : previousFailures + 1,
        responseTimeMs: Date.now() - startedAt,
        ...(isHealthy ? {} : { lastError: `HTTP ${response.status}` }),
      };
    } catch (error) {
      return {
        nodeId: node.id,
        prefix: node.prefix,
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: previousFailures + 1,
        responseTimeMs: Date.now() - startedAt,
        lastError: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }
}
