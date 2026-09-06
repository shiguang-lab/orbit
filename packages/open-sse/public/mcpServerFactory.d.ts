import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface CreateMcpServerOptions {
  blockedProviders?: string[] | (() => string[]);
}

export interface McpServerRuntimeInfo {
  version: string;
  scopesEnforced: boolean;
  allowedScopes: string[];
  toolCount: number;
}

export function createMcpServer(options?: CreateMcpServerOptions): Promise<McpServer>;
export function getMcpServerRuntimeInfo(): Promise<McpServerRuntimeInfo>;
