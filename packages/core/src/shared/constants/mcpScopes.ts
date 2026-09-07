/**
 * MCP Authorization Scopes — Defines permission scopes for each MCP tool.
 *
 * Each tool requires specific scopes to execute. API keys can be configured
 * with a subset of scopes to limit tool access (least-privilege).
 */

// ============ Scope Definitions ============

/** All available MCP scopes */
export const MCP_SCOPE_LIST = [
  "read:health",
  "read:combos",
  "write:combos",
  "read:quota",
  "read:usage",
  "read:models",
  "read:radar",
  "execute:completions",
  "execute:search",
  "write:budget",
  "write:resilience",
  "pricing:write",
  "read:cache",
  "write:cache",
  "read:compression",
  "write:compression",
  "read:proxies",
] as const;

export type McpScope = (typeof MCP_SCOPE_LIST)[number];

// ============ Tool → Scope Mapping ============

/** Maps each MCP tool to its required scopes */
export const MCP_TOOL_SCOPES: Record<string, readonly McpScope[]> = {
  // Phase 1: Essential Tools
  shiguangGateway_get_health: ["read:health"],
  shiguangGateway_list_combos: ["read:combos"],
  shiguangGateway_get_combo_metrics: ["read:combos"],
  shiguangGateway_switch_combo: ["write:combos"],
  shiguangGateway_check_quota: ["read:quota"],
  shiguangGateway_route_request: ["execute:completions"],
  shiguangGateway_web_search: ["execute:search"],
  shiguangGateway_x_search: ["execute:search"],
  shiguangGateway_web_fetch: ["execute:search"],
  shiguangGateway_cost_report: ["read:usage"],
  shiguangGateway_list_models_catalog: ["read:models"],
  shiguangGateway_radar_catalog: ["read:radar"],

  // Phase 2: Advanced Tools
  shiguangGateway_simulate_route: ["read:health", "read:combos"],
  shiguangGateway_set_budget_guard: ["write:budget"],
  shiguangGateway_set_resilience_profile: ["write:resilience"],
  shiguangGateway_test_combo: ["execute:completions", "read:combos"],
  shiguangGateway_get_provider_metrics: ["read:health"],
  shiguangGateway_best_combo_for_task: ["read:combos", "read:health"],
  shiguangGateway_explain_route: ["read:health", "read:usage"],
  shiguangGateway_get_session_snapshot: ["read:usage"],
  shiguangGateway_db_health_check: ["read:health", "write:resilience"],
  shiguangGateway_sync_pricing: ["pricing:write"],
  shiguangGateway_cache_stats: ["read:cache"],
  shiguangGateway_cache_flush: ["write:cache"],
  shiguangGateway_compression_status: ["read:compression"],
  shiguangGateway_compression_configure: ["write:compression"],
  shiguangGateway_set_compression_engine: ["write:compression"],
  shiguangGateway_list_compression_combos: ["read:compression"],
  shiguangGateway_compression_combo_stats: ["read:compression"],
  shiguangGateway_ccr_store: ["write:compression"],
  shiguangGateway_ccr_retrieve: ["read:compression"],
  shiguangGateway_ccr_inspect: ["read:compression"],
  shiguangGateway_ccr_list: ["read:compression"],
  shiguangGateway_ccr_delete: ["write:compression"],
  shiguangGateway_ccr_stats: ["read:compression"],
  shiguangGateway_oneproxy_fetch: ["read:proxies"],
  shiguangGateway_oneproxy_rotate: ["read:proxies"],
  shiguangGateway_oneproxy_stats: ["read:proxies"],

  // Web-session pool observability (read) + lifecycle (write)
  shiguangGateway_pool_status: ["read:health"],
  shiguangGateway_pool_sessions: ["read:health"],
  shiguangGateway_pool_health: ["read:health"],
  shiguangGateway_pool_reset: ["write:resilience"],
  shiguangGateway_pool_warm: ["write:resilience"],
  // Stealth browser pool observability (#3368 PR7)
  shiguangGateway_browser_pool_status: ["read:health"],
} as const;
