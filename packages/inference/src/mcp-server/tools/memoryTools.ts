import { z } from "zod";
import type { EdgeRuntimeCommand } from "@orbit/contracts/edge-runtime-command";
import { getInternalServiceAuthHeaders } from "@orbit/auth/internal-service";
import { resolveMcpCallerApiKeyId } from "../mcpCallerIdentity.ts";
import type { McpToolDefinition } from "./types.ts";

function edgeGatewayBaseUrl(): string {
  const configured = process.env.EDGE_GATEWAY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1").trim();
  const reachableHost = host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;
  return `http://${reachableHost}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
}

async function executeMemoryCommand<T>(command: EdgeRuntimeCommand): Promise<T> {
  const response = await fetch(`${edgeGatewayBaseUrl()}/api/internal/runtime/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getInternalServiceAuthHeaders() },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Edge memory command failed (${response.status})`);
  return response.json() as Promise<T>;
}

/**
 * Resolve the memory owner id for an MCP tool call.
 *
 * The authenticated caller's principal ALWAYS wins over a caller-supplied
 * `apiKeyId` — otherwise any MCP caller could read, write, or delete another
 * principal's memories by putting a different id in the tool arguments
 * (GHSA-cpv3-xr7r-xf8q, IDOR). The caller is resolved from the per-request HTTP
 * auth headers on SSE / Streamable HTTP transports, or from SHIGUANG_GATEWAY_API_KEY on
 * stdio. The explicit argument is only honored as a fallback when no caller can
 * be resolved (a bare local stdio process with no configured key — already
 * trusted), preserving the local-tooling flow. Keeps MCP-stored memories under
 * the same owner id that chat-context memory uses, so retrieval in the chat
 * pipeline finds entries written via MCP.
 */
async function resolveMemoryOwnerId(explicit?: string): Promise<string> {
  const caller = await resolveMcpCallerApiKeyId().catch(() => undefined);
  if (caller) return caller;
  if (explicit && explicit.trim() !== "") return explicit.trim();
  return "mcp";
}

export const MemorySearchSchema = z.object({
  apiKeyId: z.string().optional(),
  query: z.string().optional(),
  type: z.enum(["factual", "episodic", "procedural", "semantic"]).optional(),
  maxTokens: z.number().int().positive().max(8000).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const MemoryAddSchema = z.object({
  apiKeyId: z.string().optional(),
  sessionId: z.string().optional(),
  type: z.enum(["factual", "episodic", "procedural", "semantic"]),
  key: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MemoryClearSchema = z.object({
  apiKeyId: z.string().optional(),
  type: z.enum(["factual", "episodic", "procedural", "semantic"]).optional(),
  olderThan: z.string().datetime().optional(),
});

export const memoryTools: Record<string, McpToolDefinition> = {
  shiguangGateway_memory_search: {
    name: "shiguangGateway_memory_search",
    description: "Search memories by query, type, or API key with token budget enforcement",
    scopes: ["read:memory"],
    inputSchema: MemorySearchSchema,
    handler: async (args: z.infer<typeof MemorySearchSchema>) => {
      const apiKeyId = await resolveMemoryOwnerId(args.apiKeyId);
      const data = await executeMemoryCommand<{
        memories: Array<{ content: string }>;
        count: number;
        totalTokens: number;
      }>({
        version: 1,
        command: "memory.search",
        apiKeyId,
        query: args.query,
        type: args.type,
        maxTokens: args.maxTokens,
        limit: args.limit,
      });

      return {
        success: true,
        data,
      };
    },
  },

  shiguangGateway_memory_add: {
    name: "shiguangGateway_memory_add",
    description: "Add a new memory entry",
    scopes: ["write:memory"],
    inputSchema: MemoryAddSchema,
    handler: async (args: z.infer<typeof MemoryAddSchema>) => {
      const apiKeyId = await resolveMemoryOwnerId(args.apiKeyId);
      const { memory } = await executeMemoryCommand<{ memory: unknown }>({
        version: 1,
        command: "memory.create",
        input: {
          apiKeyId,
          sessionId: args.sessionId || "",
          type: args.type,
          key: args.key,
          content: args.content,
          metadata: args.metadata || {},
          expiresAt: null,
        },
      });

      return {
        success: true,
        data: {
          memory,
          message: "Memory created successfully",
        },
      };
    },
  },

  shiguangGateway_memory_clear: {
    name: "shiguangGateway_memory_clear",
    description: "Clear memories for an API key, optionally filtered by type or age",
    scopes: ["write:memory"],
    inputSchema: MemoryClearSchema,
    handler: async (args: z.infer<typeof MemoryClearSchema>) => {
      const apiKeyId = await resolveMemoryOwnerId(args.apiKeyId);
      const { deletedCount } = await executeMemoryCommand<{ deletedCount: number }>({
        version: 1,
        command: "memory.clear",
        apiKeyId,
        type: args.type,
        olderThan: args.olderThan ? new Date(args.olderThan).toISOString() : undefined,
      });

      return {
        success: true,
        data: {
          deletedCount,
          message: `Cleared ${deletedCount} memories`,
        },
      };
    },
  },
};
