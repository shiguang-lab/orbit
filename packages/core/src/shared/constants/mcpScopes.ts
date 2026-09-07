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
  orbit_get_health: ["read:health"],
  orbit_list_combos: ["read:combos"],
  orbit_get_combo_metrics: ["read:combos"],
  orbit_switch_combo: ["write:combos"],
  orbit_check_quota: ["read:quota"],
  orbit_route_request: ["execute:completions"],
  orbit_web_search: ["execute:search"],
  orbit_x_search: ["execute:search"],
  orbit_web_fetch: ["execute:search"],
  orbit_cost_report: ["read:usage"],
  orbit_list_models_catalog: ["read:models"],
  orbit_radar_catalog: ["read:radar"],

  // Phase 2: Advanced Tools
  orbit_simulate_route: ["read:health", "read:combos"],
  orbit_set_budget_guard: ["write:budget"],
  orbit_set_resilience_profile: ["write:resilience"],
  orbit_test_combo: ["execute:completions", "read:combos"],
  orbit_get_provider_metrics: ["read:health"],
  orbit_best_combo_for_task: ["read:combos", "read:health"],
  orbit_explain_route: ["read:health", "read:usage"],
  orbit_get_session_snapshot: ["read:usage"],
  orbit_db_health_check: ["read:health", "write:resilience"],
  orbit_sync_pricing: ["pricing:write"],
  orbit_cache_stats: ["read:cache"],
  orbit_cache_flush: ["write:cache"],
  orbit_compression_status: ["read:compression"],
  orbit_compression_configure: ["write:compression"],
  orbit_set_compression_engine: ["write:compression"],
  orbit_list_compression_combos: ["read:compression"],
  orbit_compression_combo_stats: ["read:compression"],
  orbit_ccr_store: ["write:compression"],
  orbit_ccr_retrieve: ["read:compression"],
  orbit_ccr_inspect: ["read:compression"],
  orbit_ccr_list: ["read:compression"],
  orbit_ccr_delete: ["write:compression"],
  orbit_ccr_stats: ["read:compression"],
  orbit_oneproxy_fetch: ["read:proxies"],
  orbit_oneproxy_rotate: ["read:proxies"],
  orbit_oneproxy_stats: ["read:proxies"],

  // Web-session pool observability (read) + lifecycle (write)
  orbit_pool_status: ["read:health"],
  orbit_pool_sessions: ["read:health"],
  orbit_pool_health: ["read:health"],
  orbit_pool_reset: ["write:resilience"],
  orbit_pool_warm: ["write:resilience"],
  // Stealth browser pool observability (#3368 PR7)
  orbit_browser_pool_status: ["read:health"],
} as const;
