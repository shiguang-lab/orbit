import type { z } from "zod";

/** Stable declaration boundary for MCP tool registries consumed by the server. */
export interface McpToolDefinition {
  name: string;
  description: string;
  scopes: string[];
  inputSchema: z.ZodType;
  handler: (args: any) => Promise<unknown>;
}
