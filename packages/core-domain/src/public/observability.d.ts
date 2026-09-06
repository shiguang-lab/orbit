export declare function buildTelemetryPayload(args: {
  summary: { count: number; avg?: number; p50?: number; [key: string]: unknown };
  quotaMonitorSummary: {
    active: number;
    alerting: number;
    exhausted: number;
    errors: number;
    statusCounts: Record<string, number>;
  };
  activeSessions: Array<{
    sessionId: string;
    requestCount: number;
    connectionId?: string;
    ageMs: number;
    createdAt: number;
    lastActive: number;
  }>;
}): Record<string, unknown>;
