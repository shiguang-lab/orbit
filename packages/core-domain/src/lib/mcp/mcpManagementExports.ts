/**
 * Shared MCP management capabilities.
 *
 * The control-api owns the HTTP controllers and route handlers.  This
 * package surface only publishes the MCP server's read-only management
 * primitives so the app does not reach through another package's source
 * tree.
 */
export { getAuditStats, queryAuditEntries } from "@shiguang-gateway/open-sse/mcp-server/audit";
export {
  isMcpHeartbeatOnline,
  isProcessAlive,
  readMcpHeartbeat,
  resolveMcpHeartbeatPath,
} from "@shiguang-gateway/open-sse/mcp-server/runtimeHeartbeat";
export {
  getMcpHttpStatus,
  isMcpHttpTransportReady,
} from "@shiguang-gateway/open-sse/mcp-server/httpTransport";
export { MCP_TOOLS, MCP_TOOL_MAP } from "@shiguang-gateway/open-sse/mcp-server/schemas/tools";
