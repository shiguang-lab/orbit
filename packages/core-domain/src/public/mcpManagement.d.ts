export interface McpAuditQuery {
  limit?: number;
  offset?: number;
  tool?: string;
  success?: boolean;
  apiKeyId?: string;
}

export function getAuditStats(): Promise<any>;
export function queryAuditEntries(options?: McpAuditQuery): Promise<any>;

export function resolveMcpHeartbeatPath(): string;
export function readMcpHeartbeat(): Promise<any>;
export function isProcessAlive(pid: number): boolean;
export function isMcpHeartbeatOnline(snapshot: any, options?: { requireLivePid?: boolean }): boolean;

export function getMcpHttpStatus(): {
  online: boolean;
  transport: string | null;
  startedAt: number | null;
  uptime: string | null;
};
export function isMcpHttpTransportReady(enabled: boolean, transport?: string | null): boolean;

export const MCP_TOOLS: readonly any[];
export const MCP_TOOL_MAP: Record<string, any>;
