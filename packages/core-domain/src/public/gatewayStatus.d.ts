export function buildShiguangGatewayStatus(
  getQuotaMonitorSummary: () => { active: number } | null,
): Promise<Record<string, unknown>>;
