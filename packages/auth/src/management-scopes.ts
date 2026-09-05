/** Canonical scopes used by management and MCP API-key authorization. */
export const MANAGE_SCOPE = "manage";
export const MCP_CONNECT_SCOPE = "mcp:connect";

/** Scopes that grant full management API access. */
export const MANAGEMENT_API_KEY_SCOPES = new Set<string>(["manage", "admin"]);

export function hasManageScope(scopes: readonly string[] = []): boolean {
  return scopes.some((scope) => MANAGEMENT_API_KEY_SCOPES.has(scope));
}

/** The narrow MCP-only scope is accepted in addition to full management scopes. */
export function hasMcpConnectOrManageScope(scopes: readonly string[] = []): boolean {
  return hasManageScope(scopes) || scopes.includes(MCP_CONNECT_SCOPE);
}
