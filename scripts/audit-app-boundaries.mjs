#!/usr/bin/env node

/**
 * Validate the monorepo dependency boundary.
 *
 * Apps are deployable units. They may consume shared packages, but must not
 * import another app or reach into a package's source tree through a relative
 * path. Runtime implementation belongs to an explicit domain package (for
 * example core); the retired legacy runtime split is
 * intentionally rejected.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const appsRoot = join(repoRoot, "apps");
const packagesRoot = join(repoRoot, "packages");
const scriptsRoot = join(repoRoot, "scripts");
const sourceExtensions = /\.(?:[cm]?[jt]sx?|json)$/i;
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const legacyNames = ["gateway" + "-runtime", "server" + "-runtime"];
const quotaCacheLifecycleSpecifier =
  "@orbit/core/quota/cache-lifecycle";
const complianceLifecycleSpecifier =
  "@orbit/core/compliance/lifecycle";
const sessionAffinityCleanupLifecycleSpecifier =
  "@orbit/core/session-affinity/cleanup-lifecycle";
const openRouterProviderStatsLifecycleSpecifier =
  "@orbit/core/catalog/openrouter-provider-stats-lifecycle";
const radarSyncLifecycleSpecifier =
  "@orbit/core/radar/sync-lifecycle";
const guardrailManagementSpecifier =
  "@orbit/core/control/guardrails";
const preRequestHookExecutionSpecifier =
  "@orbit/core/middleware/pre-request-hook-execution";
const violations = [];
const edgeRuntimeProxyOwnedControlFiles = new Set([
  "apps/control-api/src/monitoring/monitoring-health.service.ts",
  "apps/control-api/src/resilience/handlers/reset.handler.ts",
  "apps/control-api/src/resilience/handlers/model-cooldowns.handler.ts",
  "apps/control-api/src/resilience/handlers/resilience.handler.ts",
  "apps/control-api/src/settings/handlers/root.handler.ts",
  "apps/control-api/src/sessions/sessions.service.ts",
  "apps/control-api/src/admin/admin-concurrency.service.ts",
  "apps/control-api/src/rate-limits/rate-limits.service.ts",
  "apps/control-api/src/resilience/handlers/connections.handler.ts",
  "apps/control-api/src/providers/provider-health-autopilot.ts",
  "apps/control-api/src/gateway/runtime/gateway-status.ts",
  "apps/control-api/src/gateway/gateway.service.ts",
  "apps/control-api/src/telemetry/telemetry.service.ts",
  "apps/control-api/src/usage/handlers/quota.handler.ts",
  "apps/control-api/src/usage/reporting/resilienceExplain.ts",
  "apps/control-api/src/usage/reporting/comboScoringInspector.ts",
  "apps/control-api/src/providers/handlers/provider-detail.ts",
  "apps/control-api/src/keys/handlers/key-devices.ts",
  "apps/control-api/src/providers/providers.service.ts",
  "apps/control-api/src/cache/cache.service.ts",
  "apps/control-api/src/combos/handlers/metrics.ts",
  "apps/control-api/src/combos/handlers/auto.ts",
  "apps/control-api/src/combos/handlers/duplicate.ts",
  "apps/control-api/src/usage/reporting/comboHealth.ts",
  "apps/control-api/src/search/stats/search-stats.service.ts",
  "apps/control-api/src/settings/model-aliases/model-aliases.service.ts",
  "apps/control-api/src/settings/settings.service.ts",
  "apps/control-api/src/settings/task-routing/task-routing.service.ts",
  "apps/control-api/src/settings/security/security.service.ts",
  "apps/control-api/src/settings/tier-config/tier-config.service.ts",
  "apps/control-api/src/settings/config/settings-config.service.ts",
  "apps/control-api/src/db-backups/db-backups.service.ts",
]);

const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const rel = (file) => relative(repoRoot, file).split(sep).join("/");
const add = (rule, file, detail) => violations.push({ rule, file: rel(file), ...(detail ? { detail } : {}) });

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const info = statSync(dir);
  if (info.isFile()) {
    if (sourceExtensions.test(dir)) out.push(dir);
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    walk(join(dir, entry.name), out);
  }
  return out;
}

const appEntries = existsSync(appsRoot)
  ? readdirSync(appsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(appsRoot, entry.name, "package.json")))
      .map((entry) => ({ dir: join(appsRoot, entry.name), manifest: readJson(join(appsRoot, entry.name, "package.json")) }))
  : [];
const packageEntries = existsSync(packagesRoot)
  ? readdirSync(packagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(packagesRoot, entry.name, "package.json")))
      .map((entry) => ({ dir: join(packagesRoot, entry.name), manifest: readJson(join(packagesRoot, entry.name, "package.json")) }))
  : [];
const workspaceByName = new Map([...appEntries, ...packageEntries].filter((entry) => entry.manifest?.name).map((entry) => [entry.manifest.name, entry]));
const appByName = new Map(appEntries.filter((entry) => entry.manifest?.name).map((entry) => [entry.manifest.name, entry]));
// Keep package internals behind a small, reviewable surface. The core
// package exposes implementation subpaths only where an app has an explicit
// ownership contract; all other app imports must go through explicit package
// contracts. Deployable construction stays in each app.
const allowedCoreDomainSubpaths = {
  "apps/cli": [
    "backup/runtime",
    "cli/container-guard",
    "cli/doctor-checks",
    "cli/opencode-config",
    "cli/sqlite-driver",
    "cli/config-generator",
    "cli/tool-detector",
    "db/combos",
    "runtime/recovery-db",
    "runtime/setup-polyfill",
    "shared/constants/cliTools",
    "shared/services/qwenCodeConfig",
  ],
  "apps/realtime": ["startup", "events/eventBus", "shared/test-process", "shared/http-client-abort-guard", "sse/auth", "db/compression-analytics"],
  "apps/worker": [
    "startup",
    "worker/",
    "db/local-db",
    "backup/runtime",
    "jobs/runtime-registry",
    "jobs/cron-match",
    "a2a/runtime",
    "conductor/bridge",
    "db/conductor-bridge",
    "db/provider-connections",
    "db/connection-runtime-state",
    "db/settings",
    "runtime/provider-ports",
    "runtime/model-sync-client",
    "runtime/model-sync-operation",
    "shared/connection-isolation",
    "resilience/connection-recovery-policy",
    "resilience/circuit-breaker",
    "resilience/credential-health-cache",
    "shared/credential-probe-policy",
    "shared/test-process",
    "events/eventBus",
    "shared/free-proxies",
    "logging/proxy-log-settings",
    "shared/proxy-egress",
    "shared/proxy-health",
    "quota/cache-lifecycle",
  ],
  "apps/control-api": ["events/eventBus", "startup", "runtime/request", "db/ping", "db/health", "db/call-log-stats", "db/provider-connections", "db/model-aliases", "db/mitm-aliases", "db/hidden-models", "db/proxies", "db/settings", "db/read-cache", "db/local-db", "db/provider-stats", "db/database-stats", "db/vacuum", "catalog/provider-registry", "pricing/db", "pricing/defaults", "pricing/sync", "pricing/provider-prefixes", "pricing/validation", "pricing/modal-cost", "cache/db", "cache/services", "db/compression-analytics", "analytics/auto-routing-db", "analytics/diversity", "db-backups/db", "db-backups/validation", "metrics/combo", "metrics/request-telemetry", "metrics/observability", "metrics/tool-latency", "shared/numeric", "inference/utils/error.ts", "inference/services/deviceTracker.ts", "control/management-auth", "control/middleware-registry", "control/provider-credentials", "control/lkgp-cache", "control/management-password", "runtime/feature-flags", "control/provider-validation", "control/provider-validation-schemas", "control/oauth-validation", "control/cloud-validation", "control/volcengine-validation", "control/model-context-overrides", "control/model-test-data", "db/provider-nodes", "network/outbound-url-guard-policy", "network/safe-outbound-fetch", "control/authenticated", "control/registered-keys", "control/settings-config", "control/oauth-persistence", "memory/settings", "memory/runtime", "control/database-settings", "logging/proxy-logs", "catalog/openrouter-provider-stats", "control/provider-health-matrix", "resilience/settings", "routing/connection-model-rules", "usage/stats", "usage/model-latency-stats", "usage/request-logs", "usage/pending-requests", "db/detailed-logs", "db/proxy-logs", "logging/environment", "sync/cloud", "control/api-key-exposure", "db/api-key-groups", "usage/api-key-limits", "shared/", "sse/logger", "sse/auth", "evals/db", "evals/runner", "evals/runtime", "evals/validation", "db/api-keys", "db/batches", "plugins/db", "plugins/manager", "plugins/marketplace", "shared/cors", "quota/dimensions", "quota/db", "quota/services", "quota/state", "shared/combo-invariants", "catalog/combo-targets", "catalog/model-metadata", "catalog/provider-models"],
  "apps/edge-gateway": [
    "events/eventBus",
    "startup",
    "runtime/request",
    "edge/batches-validation-schemas",
    "middleware/prompt-injection",
    "sse/auth",
    "sse/logger",
    "edge/chat-handler",
    "edge/responses-runtime",
    "edge/codex-responses-model",
    "db/relayProxies",
    "edge/relay-chat",
    "db/settings",
    "edge/count-tokens-validation",
    "runtime/api-key-policy",
    "runtime/cc-discovery-alias",
    "routing/reasoning-policy",
    "routing/combo-steps",
    "edge/tag-router",
    "edge/memory-runtime",
    "logging/proxy-logs",
    "usage/history",
    "shared/upstream-error",
    "shared/validation/schemas",
    "shared/validation/helpers",
    "shared/connection-isolation",
    "shared/tokenizer",
    "edge/media-generation",
    "edge/specialty-catalog",
    "edge/rerank-validation-schemas",
    "db/read-cache",
    "usage/call-logs",
    "pricing/modal-cost",
    "edge/gateway-response-meta",
    "runtime/request-id",
    "edge/local-db",
    "edge/image-route-model",
    "edge/synced-endpoint-routing",
    "shared/body-size-guard",
    "shared/authz-headers",
    "shared/utils/machineId",
    "shared/utils/resolveGatewayBaseUrl",
    "shared/designer-web-retirement",
    "shared/chatgpt-web-retirement",
    "db/api-keys",
    "db/files",
    "db/batches",
    "db/combos",
    "edge/embeddings-service",
    "edge/embeddings-handler",
    "runtime/feature-flags",
    "edge/embeddings-validation-schemas",
    "edge/moderation-validation-schemas",
    "edge/image-generation-validation",
    "edge/image-upscale-validation",
    "edge/ocr-validation",
    "edge/search-validation",
    "edge/segment-validation",
    "db/models",
    "usage/call-log-api-key-context",
    "sse/image-credential-retry",
    "edge/ws-handshake",
    "db/ping",
    "db/encryption",
    "db/provider-connections",
    "db/upstream-proxy",
    "control/management-auth",
    "shared/cors-status",
    "network/remote-image-fetch",
    "catalog/unified",
    "catalog/providers",
    "catalog/model-metadata",
    "runtime/provider-ports",
    "runtime/reasoning-effort",
    "edge/codex-fast-tier",
    "embedded-services/catalog",
    "shared/compatible-provider-id",
    "edge/video-bridge-drilldown",
    "edge/video-bridge-stats",
    "guardrails/video-runtime-probe",
    "edge/video-bridge-extraction-runtime",
    "shared/error-response",
    "shared/constants/selfServiceScopes",
    "usage/cost-rules",
    "edge/provider-limits",
    "edge/internal-usage",
    "shared/cors",
    "shared/middleware/chatBodyAdmission",
    // A2A transport is app-owned; core exposes only the transport-neutral task runtime.
    "a2a/runtime",
  ],
};

allowedCoreDomainSubpaths["apps/control-api"] = allowedCoreDomainSubpaths[
  "apps/control-api"
].filter(
  (subpath) =>
    subpath !== "control/compliance" &&
    subpath !== "compliance" &&
    subpath !== "control/middleware-registry" &&
    subpath !== "control/database-settings" &&
    subpath !== "db/local-db",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "validation/proxy",
  "validation/keys",
  "validation/combos",
  "validation/routing",
  "validation/settings",
  "validation/security",
  "validation/misc",
  "compliance/audit-log",
  "db/database-settings",
  "db/model-combo-mappings",
  "db/proxy-registry",
  "db/proxy-settings",
  "db/relay-probe-stats",
  "db/webhooks",
  "routing/combo-steps",
  "network/probe-origin",
  "resilience/rate-limit-classification",
);
allowedCoreDomainSubpaths["apps/worker"] = allowedCoreDomainSubpaths["apps/worker"].filter(
  (subpath) => subpath !== "db/local-db",
);
allowedCoreDomainSubpaths["apps/worker"].push(
  "db/api-keys",
  "db/batches",
  "db/cleanup-maintenance",
  "db/files",
  "db/proxy-registry",
  "proxy-subscriptions/management",
  "db/vacuum",
  "db/vacuum-schedule",
  "pricing/sync",
  "resilience/connection-recovery",
  "sync/models-dev",
);
allowedCoreDomainSubpaths["apps/worker"].push("compliance/lifecycle");
allowedCoreDomainSubpaths["apps/worker"].push("session-affinity/cleanup-lifecycle");
allowedCoreDomainSubpaths["apps/worker"].push("catalog/openrouter-provider-stats-lifecycle");
allowedCoreDomainSubpaths["apps/worker"].push("radar/sync-lifecycle");
allowedCoreDomainSubpaths["apps/worker"].push("db/health");
allowedCoreDomainSubpaths["apps/edge-gateway"] = allowedCoreDomainSubpaths[
  "apps/edge-gateway"
].filter(
  (subpath) => subpath !== "edge/video-bridge-stats" && subpath !== "edge/local-db",
);
allowedCoreDomainSubpaths["apps/edge-gateway"].push("guardrails/modality-bridge-stats");
allowedCoreDomainSubpaths["apps/edge-gateway"].push(
  "db/database-settings",
  "db/exclusive-connection-leases",
  "db/models",
);

for (const app of ["apps/control-api", "apps/edge-gateway"]) {
  allowedCoreDomainSubpaths[app] = allowedCoreDomainSubpaths[app].filter(
    (subpath) => subpath !== "pricing/modal-cost",
  );
  allowedCoreDomainSubpaths[app].push("pricing/cost-calculator");
}

for (const app of ["apps/control-api", "apps/edge-gateway", "apps/realtime", "apps/worker"]) {
  allowedCoreDomainSubpaths[app].push("db/runtime-lifecycle");
}

allowedCoreDomainSubpaths["apps/control-api"].push("db/health");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "domain/provider-error-classifier",
  "usage/reporting-support/",
);
allowedCoreDomainSubpaths["apps/control-api"].push("db/models");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "cli/runtime",
  "cli/backups",
  "cli/config-status",
  "db/agentic-conversations",
  "usage/summary",
  "resilience/credential-health-cache",
  "resilience/model-lockout-settings",
  "db/upstream-proxy",
  "control/cli-token-auth",
  "db/tier-config",
);
allowedCoreDomainSubpaths["apps/edge-gateway"].push("runtime/model-sync-client");
allowedCoreDomainSubpaths["apps/edge-gateway"].push("edge/memory-decay");
allowedCoreDomainSubpaths["apps/edge-gateway"].push("runtime/settings-refresh");
allowedCoreDomainSubpaths["apps/edge-gateway"].push("cache/services");
allowedCoreDomainSubpaths["apps/edge-gateway"].push(
  "db/tier-config",
  "resilience/settings-runtime",
  "resilience/circuit-breaker",
  "resilience/credential-health-cache",
);
allowedCoreDomainSubpaths["apps/control-api"].push("runtime/model-sync-client");
allowedCoreDomainSubpaths["apps/control-api"].push("runtime/api-key-policy");
allowedCoreDomainSubpaths["apps/control-api"].push("db/files");
allowedCoreDomainSubpaths["apps/control-api"].push("db/connection");
allowedCoreDomainSubpaths["apps/edge-gateway"].push("db/connection");
allowedCoreDomainSubpaths["apps/control-api"].push("runtime/proxy-log-lifecycle");
allowedCoreDomainSubpaths["apps/edge-gateway"].push("runtime/proxy-log-lifecycle");
allowedCoreDomainSubpaths["apps/control-api"].push("control/guardrails", "control/auth-init");
allowedCoreDomainSubpaths["apps/control-api"].push("control/assessment", "control/policies");
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-management");
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-connection");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/provider-discovery-support/",
  "control/fallback-policy",
  "catalog/no-auth-providers",
  "providers/alibaba-regions",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/skills-github", "control/skills-executor");
// Host tunnel processes belong to the public edge runtime. Control may only
// reach them through the authenticated internal tunnel command contract.
allowedCoreDomainSubpaths["apps/edge-gateway"].push("edge/tunnels");
allowedCoreDomainSubpaths["apps/edge-gateway"].push(
  "shared/public-safe-error",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/jobs");
allowedCoreDomainSubpaths["apps/edge-gateway"].push(
  "validation/translator",
  "catalog/provider-models",
  "catalog/response-presentation",
  "catalog/model-capabilities",
  "catalog/synced-model-capabilities",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/free-provider-rankings");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/intelligence-sync",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "usage/analytics",
  "quota/provider-response",
  "db/token-limits",
  "control/token-limit-validation",
  "edge/provider-limits",
  "usage/combo-health",
);

allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/token-health-check",
  "control/oauth-gitlab",
  "lib/providers/chatgptWebRetirementResponse",
  "conductor/hub-proxy",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/cli-access-tokens",
  "control/cli-access-scopes",
  "control/access-token-auth",
  "control/provider-model-store",
  "control/provider-model-aliases",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "catalog/display-names",
  "catalog/managed-available-models",
  "catalog/model-capabilities",
  "catalog/synced-model-capabilities",
  "catalog/provider-models",
  "catalog/providers",
  "db/encryption",
  "db/webhook-deliveries",
  "shared/webhook-dispatcher",
  "shared/webhook-events",
  "shared/webhook-integrations/",
  "control/api-key-auth",
  "resilience/auto-disable-banned",
  "catalog/free-models",
  "shared/cors-status",
  "runtime/feature-flags",
  "radar/read",
  "radar/store",
  "radar/sync/catalog",
  "radar/sync/referrals",
  "radar/sync/offers",
  "radar/sync/intel",
  "db/cleanup",
  "sync/models-dev",
  "usage/call-logs",
  "shared/authz-route-policy",
  "db/provider-cc-alias",
  "db/provider-interception-rules",
  "db/provider-param-filters",
  "control/web-session-contract",
  "control/provider-auth-import",
  "providers/cursor-session",
  "control/provider-health-autopilot",
  "control/dario-installer",
  "control/cliproxy",
  "control/mux",
  "control/compression-settings",
  "control/compression-combos",
  "control/compression-judge-client",
  "usage/cost-rules",
  "control/qdrant",
  "db/compression-run-telemetry",
  "control/reasoning-routing",
  "shared/local-corpus",
  "control/notion-db",
  "integrations/notion-client",
  "db/obsidian-config",
  "integrations/obsidian-client",
  "control/obsidian-sync",
  "control/oauth-runtime/",
  "control/model-management",
  "control/traffic-inspector",
  "control/agent-bridge",
  "control/build-phase",
  "control/cursor-token-extractor",
  "control/kimi-token-refresh",
  "control/provider-auth-files/",
  "control/gamification",
  "control/gamification-db",
  "control/gamification-notifications",
  "gamification/profile",
  "gamification/rules",
  "usage/cache-health",
  "usage/provider-window-costs",
  "usage/codex-reset-credits",
  "usage/combo-forecast",
  "usage/combo-health-dashboard",
  "usage/combo-health-autopilot",
  "usage/combo-scoring-inspector",
  "usage/route-explain",
  "usage/quota-snapshots",
  "usage/utilization",
  "embedded-services/catalog",
  "embedded-services/api-key",
  "embedded-services/status",
  "control/sync-bundle",
  "control/sync-tokens",
  "control/cloud-sync-initialize",
  "control/skills-registry",
  "control/skills-github",
  "control/agent-skills",
  "control/mcp-management",
  "proxy-subscriptions/management",
  "control/model-capability-overrides",
  "control/model-context-overrides",
  "pricing/provider-prefixes",
  "shared/reasoning-efforts-override",
);
allowedCoreDomainSubpaths["apps/control-api"].push("catalog/providers");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "resilience/circuit-breaker",
  "control/model-availability",
  "resilience/connection-recovery-policy",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/guardrails");
allowedCoreDomainSubpaths["apps/control-api"].push("db/relayProxies", "shared/validation");
allowedCoreDomainSubpaths["apps/control-api"].push("db/cc-discovery-metrics");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/playground-presets",
  "db/combos",
  "shared/schemas/playground",
  "control/cli-tools-",
  "cli/config-generator",
  "cli/tool-detector",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-management");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/embedded-services-lifecycle",
  "control/embedded-services-install",
);

// Route files that have completed a physical ownership move. Keep this list
// small and explicit: adding an entry is the acceptance record for a domain
// migration, and the old core copy must be gone.
const migratedRouteOwnership = {
  "apps/control-api": [
    "api/compression/compare/route.ts",
    "api/compression/engines/route.ts",
    "api/compression/language-packs/route.ts",
    "api/compression/retrieve/route.ts",
    "api/playground/improve-prompt/route.ts",
    "api/playground/simulate-route/route.ts",
    "api/playground/presets/route.ts",
    "api/playground/presets/[id]/route.ts",
    "api/auth/csrf/route.ts",
    "api/auth/logout/route.ts",
    "api/health/route.ts",
    "api/health/ping/route.ts",
    "api/health/degradation/route.ts",
    "api/db/health/route.ts",
    "api/guardrails/route.ts",
    "api/guardrails/test/route.ts",
    "api/headroom/start/route.ts",
    "api/headroom/stop/route.ts",
    "api/headroom/status/route.ts",
    "api/tools/agent-bridge/agents/[id]/dns/route.ts",
    "api/tools/agent-bridge/repair/route.ts",
    "api/tools/agent-bridge/server/route.ts",
    "api/tools/agent-bridge/tproxy/route.ts",
    "api/tools/agent-bridge/upstream-ca/route.ts",
    "api/tools/agent-bridge/upstream-ca/test/route.ts",
    "api/jobs/route.ts",
    "api/jobs/[id]/runs/route.ts",
    "api/jobs/[id]/enable/route.ts",
    "api/jobs/[id]/disable/route.ts",
    "api/jobs/[id]/run-now/route.ts",
    "api/services/dario/status/route.ts",
    "api/services/dario/install/route.ts",
    "api/services/dario/auto-start/route.ts",
    "api/services/dario/auto-restart-adopted/route.ts",
    "api/services/dario/start/route.ts",
    "api/services/dario/restart/route.ts",
    "api/services/dario/stop/route.ts",
    "api/services/dario/update/route.ts",
    "api/gateway/status/route.ts",
    "api/token-health/route.ts",
    "api/rate-limits/route.ts",
    "api/version-manager/status/route.ts",
    "api/version-manager/check-update/route.ts",
    "api/version-manager/install/route.ts",
    "api/version-manager/start/route.ts",
    "api/version-manager/stop/route.ts",
    "api/version-manager/restart/route.ts",
    "api/synced-available-models/route.ts",
    "api/provider-stats/route.ts",
    "api/providers/openrouter-stats/route.ts",
    "api/providers/quota-windows/route.ts",
    "api/providers/expiration/route.ts",
    "api/providers/health-matrix/route.ts",
    "api/providers/free-onboarding/route.ts",
    "api/providers/cursor/agent-availability/route.ts",
    "api/providers/health-autopilot/route.ts",
    "api/providers/health-autopilot/actions/route.ts",
    "api/provider-nodes/route.ts",
    "api/provider-nodes/[id]/route.ts",
    "api/provider-models/route.ts",
    "api/provider-nodes/validate/route.ts",
    "api/providers/validate/route.ts",
    "api/providers/[id]/refresh/route.ts",
    "api/providers/[id]/refresh-token/route.ts",
    "api/providers/[id]/refresh-cursor/route.ts",
    "api/providers/[id]/chatgpt-web-codex-doctor/route.ts",
    "api/providers/[id]/claude-auth/apply-local/route.ts",
    "api/providers/[id]/claude-auth/export/route.ts",
    "api/providers/[id]/codex-auth/apply-local/route.ts",
    "api/providers/[id]/codex-auth/export/route.ts",
    "api/providers/claude-auth/import/route.ts",
    "api/providers/claude-auth/import-bulk/route.ts",
    "api/providers/claude-auth/zip-extract/route.ts",
    "api/providers/codex-auth/import/route.ts",
    "api/providers/codex-auth/import-bulk/route.ts",
    "api/providers/codex-auth/zip-extract/route.ts",
    "api/providers/agy-auth/import/route.ts",
    "api/providers/agy-auth/import-bulk/route.ts",
    "api/providers/agy-auth/zip-extract/route.ts",
    "api/providers/[id]/cc-alias/route.ts",
    "api/providers/[id]/interception-rules/route.ts",
    "api/providers/[id]/param-filters/route.ts",
    "api/providers/client/route.ts",
    "api/providers/web-session-contract/route.ts",
    "api/providers/zed/discover/route.ts",
    "api/providers/zed/import/route.ts",
    "api/providers/zed/manual-import/route.ts",
    "api/conversations/route.ts",
    "api/conversations/[id]/tree/route.ts",
    "api/providers/volcengine-plan/connect/route.ts",
    "api/providers/volcengine-plan/connect/[sessionId]/status/route.ts",
    "api/providers/volcengine-plan/connect/[sessionId]/cancel/route.ts",
    "api/providers/volcengine-plan/connect/[sessionId]/code/route.ts",
    "api/providers/volcengine-plan/connect/[sessionId]/identity/route.ts",
    "api/providers/volcengine-plan/connect/[sessionId]/resend/route.ts",
    "api/providers/command-code/auth/start/route.ts",
    "api/providers/command-code/auth/callback/route.ts",
    "api/providers/command-code/auth/status/route.ts",
    "api/providers/command-code/auth/apply/route.ts",
    "api/search/analytics/route.ts",
    "api/search/providers/route.ts",
    "api/v1/providers/suggested-models/route.ts",
    "api/v1/providers/[provider]/limits/route.ts",
    "api/v1/provider-plugin-manifest/route.ts",
    "api/v1/issues/report/route.ts",
    "api/middleware/hooks/route.ts",
    "api/middleware/hooks/[name]/route.ts",
    "api/discovery/results/route.ts",
    "api/discovery/results/[id]/route.ts",
    "api/discovery/scan/route.ts",
    "api/discovery/verify/[id]/route.ts",
    "api/keys/route.ts",
    "api/keys/[id]/route.ts",
    "api/keys/[id]/devices/route.ts",
    "api/keys/[id]/regenerate/route.ts",
    "api/keys/[id]/reveal/route.ts",
    "api/keys/[id]/usage-limits/route.ts",
    "api/keys/groups/route.ts",
    "api/keys/groups/[id]/route.ts",
    "api/keys/groups/[id]/keys/route.ts",
    "api/keys/groups/[id]/permissions/route.ts",
    "api/cli/connect/route.ts",
    "api/cli/whoami/route.ts",
    "api/cli/tokens/route.ts",
    "api/cli/tokens/[id]/route.ts",
    "api/pricing/route.ts",
    "api/pricing/defaults/route.ts",
    "api/pricing/models/route.ts",
    "api/pricing/sync/route.ts",
    "api/cache/route.ts",
    "api/cache/entries/route.ts",
    "api/cache/reasoning/route.ts",
    "api/cache/stats/route.ts",
    "api/analytics/auto-routing/route.ts",
    "api/analytics/compression/route.ts",
    "api/analytics/diversity/route.ts",
    "api/context/analytics/route.ts",
    "api/context/analytics/engine/route.ts",
    "api/db-backups/route.ts",
    "api/db-backups/export/route.ts",
    "api/db-backups/exportAll/route.ts",
    "api/db-backups/import/route.ts",
    "api/evals/route.ts",
    "api/evals/[suiteId]/route.ts",
    "api/evals/suites/route.ts",
    "api/evals/suites/[suiteId]/route.ts",
    "api/plugins/route.ts",
    "api/plugins/[name]/route.ts",
    "api/plugins/[name]/activate/route.ts",
    "api/plugins/[name]/deactivate/route.ts",
    "api/plugins/[name]/config/route.ts",
    "api/plugins/marketplace/route.ts",
    "api/plugins/marketplace/install/route.ts",
    "api/plugins/scan/route.ts",
    "api/quota/groups/route.ts",
    "api/quota/groups/[id]/route.ts",
    "api/quota/keys/[id]/models/route.ts",
    "api/quota/plans/route.ts",
    "api/quota/plans/[connectionId]/route.ts",
    "api/quota/pools/route.ts",
    "api/quota/pools/[id]/route.ts",
    "api/quota/pools/[id]/log/route.ts",
    "api/quota/pools/[id]/usage/route.ts",
    "api/quota/preview/route.ts",
    "api/models/test/route.ts",
    "api/models/test-all/route.ts",
    "api/model-capability-overrides/route.ts",
    "api/model-combo-mappings/route.ts",
    "api/model-combo-mappings/[id]/route.ts",
    "api/combos/builder/options/route.ts",
    "api/combos/route.ts",
    "api/combos/[id]/route.ts",
    "api/combos/auto/route.ts",
    "api/combos/metrics/route.ts",
    "api/combos/reorder/route.ts",
    "api/combos/duplicate/route.ts",
    "api/combos/test/route.ts",
    "api/webhooks/route.ts",
    "api/webhooks/validate-url/route.ts",
    "api/webhooks/[id]/route.ts",
    "api/webhooks/[id]/deliveries/route.ts",
    "api/webhooks/[id]/test/route.ts",
    "api/memory/route.ts",
    "api/memory/[id]/route.ts",
    "api/memory/health/route.ts",
    "api/memory/retrieve-preview/route.ts",
    "api/memory/embedding-providers/route.ts",
    "api/memory/engine-status/route.ts",
    "api/memory/summarize/route.ts",
    "api/memory/reindex/route.ts",
    "api/settings/memory/route.ts",
    "api/settings/system-prompt/route.ts",
    "api/settings/thinking-budget/route.ts",
    "api/settings/database/route.ts",
    "api/settings/database/vacuum/route.ts",
    "api/settings/database/refresh-stats/route.ts",
    "api/settings/feature-flags/route.ts",
    "api/settings/purge-call-logs/route.ts",
    "api/settings/purge-detailed-logs/route.ts",
    "api/settings/purge-logs/route.ts",
    "api/settings/purge-quota-snapshots/route.ts",
    "api/settings/purge-request-history/route.ts",
    "api/settings/purge-usage-history/route.ts",
    "api/settings/auto-disable-accounts/route.ts",
    "api/settings/background-degradation/route.ts",
    "api/settings/ip-filter/route.ts",
    "api/settings/payload-rules/route.ts",
    "api/settings/authz-inventory/route.ts",
    "api/settings/cache-config/route.ts",
    "api/settings/cache-metrics/route.ts",
    "api/settings/lkgp-cache/route.ts",
    "api/settings/tier-config/route.ts",
    "api/settings/oneproxy/route.ts",
    "api/settings/oneproxy/rotate/route.ts",
    "api/settings/free-proxies/route.ts",
    "api/settings/free-proxies/stats/route.ts",
    "api/settings/free-proxies/sync/route.ts",
    "api/settings/free-proxies/bulk-add-to-pool/route.ts",
    "api/settings/free-proxies/[id]/add-to-pool/route.ts",
    "api/settings/compression/route.ts",
    "api/settings/compression/rules/route.ts",
    "api/settings/compression/mcp-accessibility/route.ts",
    "api/settings/compression/run-telemetry/route.ts",
    "api/compression/rules/route.ts",
    "api/context/caveman/config/route.ts",
    "api/context/combos/route.ts",
    "api/context/combos/default/route.ts",
    "api/context/combos/[id]/route.ts",
    "api/context/combos/[id]/assignments/route.ts",
    "api/context/rtk/config/route.ts",
    "api/context/rtk/discover/route.ts",
    "api/context/rtk/filters/route.ts",
    "api/settings/qdrant/route.ts",
    "api/settings/qdrant/health/route.ts",
    "api/settings/qdrant/search/route.ts",
    "api/settings/qdrant/cleanup/route.ts",
    "api/settings/qdrant/embedding-models/route.ts",
    "api/settings/reasoning-routing-rules/route.ts",
    "api/settings/reasoning-routing-rules/[id]/route.ts",
    "api/settings/reasoning-routing-rules/simulate/route.ts",
    "api/settings/quota-store/route.ts",
    "api/settings/quota/state/route.ts",
    "api/settings/cc-discovery-metrics/route.ts",
    "api/settings/task-routing/route.ts",
    "api/settings/model-aliases/route.ts",
    "api/settings/local-corpus/route.ts",
    "api/settings/notion/route.ts",
    "api/settings/obsidian/route.ts",
    "api/settings/obsidian/webdav/route.ts",
    "api/settings/proxy/test/route.ts",
    "api/settings/proxy/route.ts",
    "api/settings/proxy/cloudflare-deploy/route.ts",
    "api/settings/proxy/deno-deploy/route.ts",
    "api/settings/proxy/vercel-deploy/route.ts",
    "api/settings/proxies/route.ts",
    "api/settings/proxies/assignments/route.ts",
    "api/settings/proxies/health/route.ts",
    "api/v1/management/proxies/health/route.ts",
    "api/settings/proxies/pool/route.ts",
    "api/settings/proxies/bulk-assign/route.ts",
    "api/settings/proxies/bulk-import/route.ts",
    "api/settings/proxies/batch-activate/route.ts",
    "api/settings/proxies/batch-delete/route.ts",
    "api/sync/initialize/route.ts",
    "api/sync/bundle/route.ts",
    "api/sync/cloud/route.ts",
    "api/sync/tokens/route.ts",
    "api/sync/tokens/[id]/route.ts",
    "api/v1/management/proxy-subscriptions/route.ts",
    "api/v1/management/proxy-subscriptions/[id]/route.ts",
    "api/v1/management/proxy-subscriptions/[id]/nodes/route.ts",
    "api/v1/management/proxy-subscriptions/[id]/refresh/route.ts",
    "api/v1/management/proxies/route.ts",
    "api/v1/management/proxies/assignments/route.ts",
    "api/v1/management/proxies/bulk-assign/route.ts",
    "api/cloud/auth/route.ts",
    "api/cloud/credentials/update/route.ts",
    "api/cloud/model/resolve/route.ts",
    "api/cloud/models/alias/route.ts",
    "api/system/version/route.ts",
    "api/services/dario/admin/accounts/route.ts",
    "api/services/dario/admin/import-from-gateway/route.ts",
    "api/services/dario/admin/login-complete/route.ts",
    "api/services/dario/admin/login-start/route.ts",
    "api/services/9router/status/route.ts",
    "api/services/9router/models/route.ts",
    "api/services/9router/install/route.ts",
    "api/services/9router/auto-start/route.ts",
    "api/services/9router/auto-restart-adopted/route.ts",
    "api/services/9router/provider-expose/route.ts",
    "api/services/9router/start/route.ts",
    "api/services/9router/restart/route.ts",
    "api/services/9router/stop/route.ts",
    "api/services/9router/rotate-key/route.ts",
    "api/services/9router/update/route.ts",
    "api/radar/catalog/route.ts",
    "api/radar/referrals/route.ts",
    "api/radar/offers/route.ts",
    "api/radar/offers/sync/route.ts",
    "api/radar/intel/route.ts",
    "api/radar/intel/sync/route.ts",
    "api/radar/sync/route.ts",
    "api/radar/sync-all/route.ts",
    "api/radar/settings/route.ts",
    "api/radar/status/route.ts",
    "api/radar/local-model-state/route.ts",
    "api/services/cliproxy/accounts/route.ts",
    "api/services/cliproxy/auto-restart-adopted/route.ts",
    "api/services/cliproxy/auto-start/route.ts",
    "api/services/cliproxy/install/route.ts",
    "api/services/cliproxy/login/[id]/cancel/route.ts",
    "api/services/cliproxy/login/[id]/route.ts",
    "api/services/cliproxy/login/start/route.ts",
    "api/services/cliproxy/provider-expose/route.ts",
    "api/services/cliproxy/restart/route.ts",
    "api/services/cliproxy/start/route.ts",
    "api/services/cliproxy/status/route.ts",
    "api/services/cliproxy/stop/route.ts",
    "api/services/cliproxy/update/route.ts",
    "api/usage/budget/route.ts",
    "api/usage/budget/bulk/route.ts",
    "api/usage/history/route.ts",
    "api/usage/model-latency-stats/route.ts",
    "api/usage/cache-health/route.ts",
    "api/usage/provider-window-costs/route.ts",
    "api/usage/route-explain/[id]/route.ts",
    "api/usage/utilization/route.ts",
    "api/usage/codex-reset-credit/route.ts",
    "api/usage/combo-forecast/route.ts",
    "api/usage/combo-health-dashboard/route.ts",
    "api/usage/combo-health-autopilot/route.ts",
    "api/usage/combo-scoring-inspector/route.ts",
    "api/oauth/[provider]/[action]/route.ts",
    "api/oauth/[provider]/paste-credentials/route.ts",
    "api/oauth/cliproxy-import/route.ts",
    "api/oauth/codex/import-token/route.ts",
    "api/oauth/codex/import/route.ts",
    "api/oauth/cursor/auto-import/route.ts",
    "api/oauth/cursor/import/route.ts",
    "api/oauth/cursor/login/cancel/route.ts",
    "api/oauth/cursor/login/poll/route.ts",
    "api/oauth/cursor/login/start/route.ts",
    "api/oauth/kiro/api-key/route.ts",
    "api/oauth/kiro/auto-import/route.ts",
    "api/oauth/kiro/import/route.ts",
    "api/oauth/kiro/social-authorize/route.ts",
    "api/oauth/kiro/social-exchange/route.ts",
    "api/oauth/trae/import/route.ts",
    "api/gamification/anomalies/route.ts",
    "api/gamification/badges/route.ts",
    "api/gamification/badges/earned/route.ts",
    "api/gamification/federation/leaderboard/route.ts",
    "api/gamification/federation/score/route.ts",
    "api/gamification/invite/route.ts",
    "api/gamification/invite/redeem/route.ts",
    "api/gamification/leaderboard/route.ts",
    "api/gamification/level/route.ts",
    "api/gamification/notifications/route.ts",
    "api/gamification/rotate/route.ts",
    "api/gamification/servers/route.ts",
    "api/gamification/stream/route.ts",
    "api/gamification/transfer/route.ts",
    "api/tools/traffic-inspector/capture-modes/route.ts",
    "api/tools/traffic-inspector/capture-modes/http-proxy/route.ts",
    "api/tools/traffic-inspector/capture-modes/system-proxy/route.ts",
    "api/tools/traffic-inspector/capture-modes/tls-intercept/route.ts",
    "api/tools/traffic-inspector/export.har/route.ts",
    "api/tools/traffic-inspector/hosts/route.ts",
    "api/tools/traffic-inspector/hosts/[host]/route.ts",
    "api/tools/traffic-inspector/internal/ingest/route.ts",
    "api/tools/traffic-inspector/requests/route.ts",
    "api/tools/traffic-inspector/requests/[id]/route.ts",
    "api/tools/traffic-inspector/requests/[id]/annotation/route.ts",
    "api/tools/traffic-inspector/requests/[id]/replay/route.ts",
    "api/tools/traffic-inspector/sessions/route.ts",
    "api/tools/traffic-inspector/ws/route.ts",
    "api/tools/agent-bridge/config/route.ts",
    "api/tools/agent-bridge/bypass/route.ts",
    "api/tools/agent-bridge/agents/route.ts",
    "api/tools/agent-bridge/agents/[id]/route.ts",
    "api/tools/agent-bridge/agents/[id]/detect/route.ts",
    "api/tools/agent-bridge/agents/[id]/detected-models/route.ts",
    "api/tools/agent-bridge/agents/[id]/mappings/route.ts",
    "api/tools/agent-bridge/state/route.ts",
    "api/tools/agent-bridge/diagnose/route.ts",
    "api/tools/agent-bridge/cert/route.ts",
    "api/tools/agent-bridge/cert/regenerate/route.ts",
    "api/tools/agent-bridge/cert/download/route.ts",
    "api/skills/route.ts",
    "api/skills/[id]/route.ts",
    "api/skills/install/route.ts",
    "api/skills/marketplace/route.ts",
    "api/skills/marketplace/install/route.ts",
    "api/skills/skillssh/route.ts",
    "api/skills/skillssh/install/route.ts",
    "api/skills/collect/detect/route.ts",
    "api/skills/collect/install/route.ts",
    "api/mcp/audit/route.ts",
    "api/mcp/audit/stats/route.ts",
    "api/mcp/status/route.ts",
    "api/mcp/tools/route.ts",
    "api/acp/agents/route.ts",
    "api/batches/route.ts",
    "api/batches/[id]/route.ts",
  ],
  "apps/edge-gateway": [
    // A2A protocol and task-management routes are owned by the edge Nest app.
    // The old Next route tree must stay empty; the controller contract is the
    // single registration surface for both canonical and /api aliases.
    "a2a/route.ts",
    "api/telegram/update/route.ts",
    "api/a2a/status/route.ts",
    "api/a2a/tasks/route.ts",
    "api/a2a/tasks/[id]/route.ts",
    "api/a2a/tasks/[id]/cancel/route.ts",
    "api/v1/music/generations/route.ts",
    "api/v1/speech-to-text/route.ts",
    "api/v1/voices/route.ts",
    "api/v1/ws/route.ts",
    "api/v1/moderations/route.ts",
    "api/v1/rerank/route.ts",
    "api/v1/embeddings/route.ts",
    "api/v1/explain/routing/route.ts",
    "api/v1/classify/route.ts",
    "api/v1/text-to-speech/[voiceId]/route.ts",
    "api/v1/audio/transcriptions/route.ts",
    "api/v1/audio/speech/route.ts",
    "api/v1/audio/translations/route.ts",
    "api/v1/images/edits/route.ts",
    "api/v1/images/generations/route.ts",
    "api/v1/images/upscale/route.ts",
    "api/v1/providers/[provider]/images/generations/route.ts",
    "api/v1/video-bridge/drilldown/route.ts",
    "api/modality-bridge/stats/route.ts",
    "api/modality-bridge/video/runtime/route.ts",
    "api/v1/web/fetch/route.ts",
    "api/v1/ocr/route.ts",
    "api/v1/segment/route.ts",
    "api/v1/videos/generations/route.ts",
    "api/v1/files/route.ts",
    "api/v1/files/[id]/route.ts",
    "api/v1/files/[id]/content/route.ts",
    "api/v1/batches/route.ts",
    "api/v1/batches/[id]/route.ts",
    "api/v1/batches/[id]/cancel/route.ts",
    "api/v1/batches/delete-completed/route.ts",
    "api/v1beta/models/route.ts",
    "api/v1beta/models/[...path]/route.ts",
    "api/vnc-session/route.ts",
    "api/vnc-session/[...params]/route.ts",
    "api/v1/models/[...model]/route.ts",
    "api/v1/muse-code/models/route.ts",
    "api/v1/me/status/route.ts",
    "api/v1/completions/route.ts",
    "api/v1/chat/completions/route.ts",
    "api/v1/messages/route.ts",
    "api/v1/messages/count_tokens/route.ts",
    "api/v1/responses/route.ts",
    "api/v1/relay/chat/completions/bifrost/route.ts",
    "api/v1/antigravity/route.ts",
    "api/v1/auto-combo/[channel]/candidates/route.ts",
    "api/v1/vscode/[token]/api/version/route.ts",
    "api/v1/search/route.ts",
    "api/upstream-proxy/[providerId]/route.ts",
    "api/cursor-cli/[...path]/route.ts",
  ],
};

// Realtime transport is an app-owned listener. Keep the core package from
// regressing into a second WebSocket implementation or re-exporting it.
const coreDomain = packageEntries.find((entry) => entry.manifest?.name === "@orbit/core");
if (coreDomain) {
  const exportsMap = coreDomain.manifest?.exports ?? {};
  for (const exportPath of Object.keys(exportsMap)) {
    if (exportPath.includes("live-server") || exportPath.includes("server/ws")) {
      add("core-realtime-export", join(coreDomain.dir, "package.json"), exportPath);
    }
  }
  const legacyRealtimeDir = join(coreDomain.dir, "src", "server", "ws");
  if (existsSync(legacyRealtimeDir)) {
    add("core-realtime-implementation", legacyRealtimeDir, "live WebSocket code must live in apps/realtime");
  }
  const coreApiRoot = join(coreDomain.dir, "src", "app", "api");
  for (const file of walk(coreApiRoot)) {
    const route = relative(coreApiRoot, file).split(sep).join("/");
    if (/^(live|events|realtime)(\/|$)/.test(route)) {
      add("core-realtime-route", file, "realtime HTTP/SSE routes must live in apps/realtime");
    }
  }
}

for (const legacy of legacyNames) {
  const dir = join(packagesRoot, legacy);
  if (existsSync(dir)) add("retired-runtime-directory", dir, `packages/${legacy} must be removed`);
}
const retiredCoreVscodeDir = join(packagesRoot, "core", "src", "lib", "vscode");
if (existsSync(retiredCoreVscodeDir)) {
  add("edge-runtime-in-core", retiredCoreVscodeDir, "VS Code transport and presentation runtime belongs in apps/edge-gateway");
}
const retiredCoreCliRuntimeFiles = [
  join(packagesRoot, "core", "src", "lib", "cli-helper", "log-streamer.ts"),
  join(packagesRoot, "core", "src", "shared", "platform", "windowsProcess.ts"),
];
for (const file of retiredCoreCliRuntimeFiles) {
  if (existsSync(file)) add("cli-runtime-in-core", file, "CLI-owned runtime belongs in apps/cli");
}
const retiredCoreAcpDir = join(packagesRoot, "core", "src", "lib", "acp");
if (existsSync(retiredCoreAcpDir)) {
  add("control-runtime-in-core", retiredCoreAcpDir, "ACP inventory runtime belongs in apps/control-api");
}
const retiredCoreChaosDir = join(packagesRoot, "core", "src", "lib", "chaos");
if (existsSync(retiredCoreChaosDir)) {
  add("control-runtime-in-core", retiredCoreChaosDir, "Chaos runtime belongs in apps/control-api");
}
const retiredCorePlaygroundDir = join(packagesRoot, "core", "src", "lib", "playground");
if (existsSync(retiredCorePlaygroundDir)) {
  add("control-runtime-in-core", retiredCorePlaygroundDir, "Playground runtime belongs in apps/control-api or apps/admin");
}
const retiredCoreTelegramDir = join(packagesRoot, "core", "src", "lib", "telegram");
if (existsSync(retiredCoreTelegramDir)) {
  add("edge-runtime-in-core", retiredCoreTelegramDir, "Telegram ingress runtime belongs in apps/edge-gateway");
}
const retiredControlTelegramIngress = [
  join(repoRoot, "apps", "control-api", "src", "telegram", "telegram.controller.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "telegram.service.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "telegram.module.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "handlers", "update.handler.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "bot-api.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "chat-proxy.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "config.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "error-message.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "index.ts"),
  join(repoRoot, "apps", "control-api", "src", "telegram", "runtime", "init-data.ts"),
];
for (const file of retiredControlTelegramIngress) {
  if (existsSync(file)) {
    add("public-telegram-ingress-in-control", file, "POST /api/telegram/update and its chat pipeline belong in apps/edge-gateway");
  }
}
const retiredCoreCopilotDir = join(packagesRoot, "core", "src", "lib", "copilot");
if (existsSync(retiredCoreCopilotDir)) {
  add("control-runtime-in-core", retiredCoreCopilotDir, "Copilot runtime belongs in apps/control-api");
}
const retiredCoreRoutingPreview = join(packagesRoot, "core", "src", "lib", "routing", "adaptiveRouting.ts");
if (existsSync(retiredCoreRoutingPreview)) {
  add("control-runtime-in-core", retiredCoreRoutingPreview, "Routing preview runtime belongs in apps/control-api");
}
const retiredCoreGatewayStatus = join(packagesRoot, "core", "src", "lib", "gatewayStatus.ts");
if (existsSync(retiredCoreGatewayStatus)) {
  add("control-runtime-in-core", retiredCoreGatewayStatus, "Gateway status composition belongs in apps/control-api");
}
const retiredCoreFreeOnboarding = join(packagesRoot, "core", "src", "lib", "providers", "freeOnboarding.ts");
if (existsSync(retiredCoreFreeOnboarding)) {
  add("control-runtime-in-core", retiredCoreFreeOnboarding, "Provider onboarding orchestration belongs in apps/control-api");
}
const retiredCoreProjectCombo = join(packagesRoot, "core", "src", "lib", "catalog", "projectCombo.ts");
if (existsSync(retiredCoreProjectCombo)) {
  add("edge-runtime-in-core", retiredCoreProjectCombo, "Client combo projection belongs in apps/edge-gateway");
}
const retiredCoreRelayBifrostFacade = join(packagesRoot, "core", "src", "lib", "edge", "relayBifrost.ts");
if (existsSync(retiredCoreRelayBifrostFacade)) {
  add("redundant-core-facade", retiredCoreRelayBifrostFacade, "Edge handlers must use the shared relay proxy DB contract directly");
}
const retiredCoreProviderTestBatchFacade = join(packagesRoot, "core", "src", "lib", "providers", "testBatch.ts");
if (existsSync(retiredCoreProviderTestBatchFacade)) {
  add("redundant-core-facade", retiredCoreProviderTestBatchFacade, "Provider batch validation belongs in apps/control-api");
}
const retiredCoreUsageDbFacade = join(packagesRoot, "core", "src", "lib", "usageDb.ts");
if (existsSync(retiredCoreUsageDbFacade)) {
  add("redundant-core-facade", retiredCoreUsageDbFacade, "Usage capabilities must use their explicit usage/* contracts");
}
const retiredCoreUsageDbDeclaration = join(packagesRoot, "core", "src", "public", "usageDb.d.ts");
if (existsSync(retiredCoreUsageDbDeclaration)) {
  add("orphan-public-declaration", retiredCoreUsageDbDeclaration, "The mixed usage database contract is retired");
}
const retiredCoreModelsFacade = join(packagesRoot, "core", "src", "models", "index.ts");
if (existsSync(retiredCoreModelsFacade)) {
  add("redundant-core-facade", retiredCoreModelsFacade, "Consumers must use the narrow database and runtime contracts");
}
for (const retiredProviderDeclaration of ["providerMetadata.d.ts", "providerNodeConstants.d.ts"]) {
  const file = join(packagesRoot, "core", "src", "public", retiredProviderDeclaration);
  if (existsSync(file)) {
    add("orphan-public-declaration", file, "Provider catalog consumers must use the canonical catalog/providers contract");
  }
}
const retiredCoreClientApiAuth = join(packagesRoot, "core", "src", "shared", "utils", "clientApiRouteAuth.ts");
if (existsSync(retiredCoreClientApiAuth)) {
  add("edge-runtime-in-core", retiredCoreClientApiAuth, "Client API route authentication belongs in apps/edge-gateway");
}
const retiredCoreRateLimitSources = [
  join(packagesRoot, "core", "src", "lib", "edge", "rateLimit.ts"),
  join(packagesRoot, "core", "src", "lib", "resilience", "rateLimit.ts"),
];
for (const source of retiredCoreRateLimitSources) {
  if (existsSync(source)) {
    add("mixed-runtime-boundary", source, "Credential selection belongs in inference and HTTP adaptation belongs in apps/edge-gateway");
  }
}
const retiredCoreEnvRepairSources = [
  join(packagesRoot, "core", "src", "control", "env-repair.ts"),
  join(packagesRoot, "core", "scripts", "dev", "sync-env.mjs"),
];
for (const source of retiredCoreEnvRepairSources) {
  if (existsSync(source)) {
    add("control-runtime-in-core", source, "Environment repair runtime belongs in apps/control-api");
  }
}
const retiredUnreachableCoreSources = [
  join(packagesRoot, "core", "src", "lib", "batches"),
  ...["builderDraft.ts", "comboSort.ts", "controlCenter.ts", "intelligentRouting.ts"].map((file) =>
    join(packagesRoot, "core", "src", "lib", "combos", file)),
  ...["activityIcons.ts", "timeline.ts"].map((file) =>
    join(packagesRoot, "core", "src", "lib", "audit", file)),
];
for (const source of retiredUnreachableCoreSources) {
  if (existsSync(source) && (statSync(source).isFile() || walk(source).length > 0)) {
    add("retired-unreachable-core-source", source, "unreachable app-era implementation must not return to core");
  }
}

// The shared HTTP package must never regain a generic app factory or a
// caller-selected surface. Those APIs collapse independently deployable apps
// back into one parameterized runtime.
const httpKernel = packageEntries.find((entry) => entry.manifest?.name === "@orbit/http");
if (httpKernel) {
  for (const file of walk(join(httpKernel.dir, "src"))) {
    const source = readFileSync(file, "utf8");
    if (/create(?:EdgeGateway|ControlApi|Nest)Application|register(?:EdgeGateway|ControlApi)Infrastructure/.test(source)) {
      add("parameterized-http-app-factory", file, "HTTP app construction belongs to apps/*");
    }
    if (/\bsurface\s*[?:]/.test(source)) {
      add("http-surface-selector", file, "shared transport must not select an app boundary");
    }
  }
}

function extractControllerRoutes(controllerFile) {
  const source = readFileSync(controllerFile, "utf8");
  const controllerMatch = source.match(/@Controller\s*\(\s*(?:\[([^\]]*)\]|["'`\x27\x60](.*?)["'`\x27\x60])?\s*\)/);
  if (!controllerMatch) return [];
  let basePrefixes = [""];
  if (controllerMatch[1]) {
    basePrefixes = controllerMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/^["'`\x27\x60]/, "").replace(/["'`\x27\x60]$/, "").replace(/^\/+/, "").replace(/\/+$/, ""))
      .filter(Boolean);
    if (basePrefixes.length === 0) basePrefixes = [""];
  } else if (controllerMatch[2] !== undefined) {
    basePrefixes = [controllerMatch[2].trim().replace(/^\/+/, "").replace(/\/+$/, "")];
  }

  const methodRegex = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:(?:\[([^\]]*)\])|(?:["'`\x27\x60](.*?)["'`\x27\x60]))?\s*\)/g;
  const routes = new Set();
  let match;
  while ((match = methodRegex.exec(source)) !== null) {
    let subPaths = [""];
    if (match[2]) {
      subPaths = match[2].split(",").map(s => s.trim().replace(/^["'`\x27\x60]/, "").replace(/["'`\x27\x60]$/, "")).filter(Boolean);
    } else if (match[3] !== undefined) {
      subPaths = [match[3].trim()];
    }
    for (const basePrefix of basePrefixes) {
      for (let subPath of subPaths) {
        let fullPath = [basePrefix, subPath].filter(Boolean).join("/");
        if (fullPath.startsWith("api/")) fullPath = fullPath.slice("api/".length);
        fullPath = fullPath.replace(/\/\*$/, fullPath.startsWith("v1beta/models/") || fullPath.startsWith("cursor-cli/") ? "/[...path]" : (fullPath.startsWith("vnc-session/") ? "/[...params]" : "/[...model]"));
        fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, "[$1]");
        const routePath = `${fullPath ? fullPath + "/" : ""}route.ts`;
        routes.add(routePath);
        routes.add(`api/${routePath}`);
      }
    }
  }
  return routes;
}

const coreRouteRoot = join(packagesRoot, "core", "src", "app");
const legacyA2ARouteRoots = [
  join(coreRouteRoot, "a2a"),
  join(coreRouteRoot, "api", "a2a"),
];
for (const legacyRoot of legacyA2ARouteRoots) {
  for (const file of walk(legacyRoot)) {
    add("duplicate-core-a2a-route", file, "A2A transport is owned by apps/edge-gateway; legacy Next routes must be removed");
  }
}
for (const [appPath, routePaths] of Object.entries(migratedRouteOwnership)) {
  const appDir = join(repoRoot, appPath);
  const appRouteRoot = join(appDir, "src", "routes");
  const controllers = walk(join(appDir, "src")).filter((f) => f.endsWith(".controller.ts"));
  const implementedRoutes = new Set();
  for (const ctrl of controllers) {
    for (const r of extractControllerRoutes(ctrl)) {
      implementedRoutes.add(r);
    }
  }
  if (
    appPath === "apps/control-api" &&
    (implementedRoutes.has("telegram/update/route.ts") ||
      implementedRoutes.has("api/telegram/update/route.ts"))
  ) {
    add(
      "public-telegram-ingress-in-control",
      appDir,
      "POST /api/telegram/update belongs exclusively to apps/edge-gateway",
    );
  }

  for (const routePath of routePaths) {
    const appFile = join(appRouteRoot, routePath);
    const coreFile = join(coreRouteRoot, routePath);
    const hasImplementation = existsSync(appFile) || implementedRoutes.has(routePath) || implementedRoutes.has(routePath.replace(/^api\//, ""));
    if (!hasImplementation) add("missing-migrated-route", appFile, "route ownership record has no app implementation");
    if (existsSync(coreFile)) add("duplicate-core-route", coreFile, `physically owned by ${appPath}`);
  }
}

const importRe = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
for (const app of appEntries) {
  if (!app.manifest) {
    add("invalid-package-json", join(app.dir, "package.json"));
    continue;
  }
  const declared = new Set(Object.keys({ ...(app.manifest.dependencies ?? {}), ...(app.manifest.devDependencies ?? {}), ...(app.manifest.optionalDependencies ?? {}) }));
  const workspaceDeps = [...declared].map((name) => workspaceByName.get(name)).filter(Boolean);
  for (const dep of workspaceDeps) {
    if (appByName.has(dep.manifest.name)) add("cross-app-workspace-dependency", join(app.dir, "package.json"), `${app.manifest.name} -> ${dep.manifest.name}`);
  }
  for (const file of walk(join(app.dir, "src"))) {
    const source = readFileSync(file, "utf8");
    if (/import\s+\*\s+as\s+\w+\s+from\s+["']@orbit\/inference\/utils\/logger["']/.test(source)) {
      add(
        "app-imports-logger-as-ghost-namespace",
        file,
        "consume the exported log object; the logger module has no top-level level methods",
      );
    }
    if (
      rel(app.dir) === "apps/control-api" &&
      /@orbit\/inference\/(?:services\/chat-completions-compat|services\/rateLimitManager(?:\/errors)?)/.test(source)
    ) {
      add(
        "control-invokes-edge-request-runtime-in-process",
        file,
        "control-generated requests must use edge HTTP; edge-owned rate limiting must not also run in control",
      );
    }
    if (
      rel(app.dir) === "apps/control-api" &&
      /@orbit\/inference\/services\/(?:token-refresh|credentialTokenRefresh|kimiTokenRefresh)/.test(source)
    ) {
      add(
        "control-refreshes-persisted-provider-credentials",
        file,
        "persisted connection refresh exchanges and token persistence belong to the authenticated edge command owner",
      );
    }
    if (
      edgeRuntimeProxyOwnedControlFiles.has(rel(file)) &&
      /@orbit\/(?:inference\/(?:services\/(?:accountFallback|rateLimitManager|requestDedup|quotaMonitor|sessionManager|accountSemaphore|webSessionPoolHealth|signatureCache|deviceTracker|comboMetrics|toolLatencyTracker|searchCache|reasoningCache|quotaPreflight|modelDeprecation|systemPrompt|thinkingBudget|taskAwareRouter|backgroundTaskDetector|ipFilter|payloadRules|tier-resolver|autoCombo\/(?:virtualFactory|freeAccessQuota|builtinCatalog|modelFamily|autoPrefix|suffixComposition))|executors\/cliproxyapi)|core\/resilience\/circuit-breaker)/.test(source)
    ) {
      add(
        "control-imports-edge-runtime-singleton",
        file,
        "control diagnostics and commands must use the authenticated edge runtime command contract",
      );
    }
    if (
      [
        "apps/control-api/src/proxies/proxies.service.ts",
        "apps/control-api/src/settings/proxy/proxy-settings.service.ts",
      ].includes(rel(file)) &&
      /import\s*\{[^}]*\bclearDispatcherCache\b[^}]*\}\s*from\s*["']@orbit\/inference\/utils\/proxyDispatcher["']/.test(source)
    ) {
      add(
        "control-invalidates-edge-runtime-cache",
        file,
        "control proxy mutations must invalidate the edge dispatcher cache through the authenticated command contract",
      );
    }
    if (
      rel(file) === "apps/control-api/src/cache/cache.service.ts" &&
      /\b(?:getCacheStats|clearCache|invalidateByModel|invalidateBySignature|invalidateStale|clearMemoryCache|getMemoryCacheStats)\b/.test(source)
    ) {
      add(
        "control-accesses-edge-semantic-cache",
        file,
        "control semantic-cache management must use the authenticated edge runtime command contract",
      );
    }
    if (
      rel(app.dir) === "apps/control-api" &&
      /@orbit\/inference\/services\/(?:providerLimits|codexResetCredits)/.test(source)
    ) {
      add(
        "control-imports-edge-quota-runtime",
        file,
        "provider-limits listeners, refresh timers, and quota caches belong to edge runtime commands",
      );
    }
    if (
      rel(app.dir) === "apps/control-api" &&
      /\bgetJobRegistry\b|@orbit\/core\/(?:worker\/jobs|worker\/cloud-sync|control\/(?:cloud-sync-initialize|model-sync-scheduler))/.test(source)
    ) {
      add("control-imports-worker-job-runtime", file, "control-api may only read job projections and send versioned worker commands");
    }
    if (legacyNames.some((name) => source.includes(name))) add("retired-runtime-reference", file);
    for (const match of source.matchAll(importRe)) {
      const specifier = match[1] ?? match[2] ?? "";
      if (specifier === quotaCacheLifecycleSpecifier && rel(app.dir) !== "apps/worker") {
        add(
          "quota-cache-lifecycle-outside-worker",
          file,
          "only the worker may own quota cache background refresh lifecycle",
        );
      }
      if (specifier === complianceLifecycleSpecifier && rel(app.dir) !== "apps/worker") {
        add(
          "compliance-lifecycle-outside-worker",
          file,
          "only the worker may invoke compliance initialization and retention lifecycle",
        );
      }
      if (specifier === sessionAffinityCleanupLifecycleSpecifier && rel(app.dir) !== "apps/worker") {
        add(
          "session-affinity-cleanup-lifecycle-outside-worker",
          file,
          "only the worker may own session-affinity cleanup lifecycle",
        );
      }
      if (specifier === openRouterProviderStatsLifecycleSpecifier && rel(app.dir) !== "apps/worker") {
        add(
          "openrouter-provider-stats-lifecycle-outside-worker",
          file,
          "only the worker may own OpenRouter provider stats refresh lifecycle",
        );
      }
      if (specifier === radarSyncLifecycleSpecifier && rel(app.dir) !== "apps/worker") {
        add(
          "radar-sync-lifecycle-outside-worker",
          file,
          "only the worker may own Radar background synchronization lifecycle",
        );
      }
      if (specifier === guardrailManagementSpecifier && rel(app.dir) !== "apps/control-api") {
        add(
          "guardrail-management-outside-control-api",
          file,
          "only control-api may register or inspect the mutable guardrail registry",
        );
      }
      if (specifier === preRequestHookExecutionSpecifier) {
        add(
          "pre-request-hook-execution-imported-by-app",
          file,
          "inference owns pre-request hook execution on the edge request path",
        );
      }
      if (specifier.startsWith(".")) {
        const target = resolve(file, "..", specifier);
        if (target.includes(`${sep}apps${sep}`) && !target.startsWith(`${app.dir}${sep}`)) add("cross-app-relative-import", file, specifier);
        if (target.includes(`${sep}packages${sep}`)) add("package-source-relative-import", file, specifier);
        if (target === scriptsRoot || target.startsWith(`${scriptsRoot}${sep}`)) {
          add(
            "app-imports-root-script",
            file,
            `${specifier}; deployable app source must not escape its app root into repository scripts`,
          );
        }
      }
      const workspace = workspaceByName.get(specifier) ?? [...workspaceByName.entries()].find(([name]) => specifier.startsWith(`${name}/`))?.[1];
      if (workspace && appByName.has(workspace.manifest.name)) add("cross-app-import", file, specifier);
      if (workspace && !declared.has(workspace.manifest.name)) add("undeclared-workspace-import", file, specifier);
      if (specifier.startsWith("@orbit/core/")) {
        const subpath = specifier.slice("@orbit/core/".length);
        const allowed = allowedCoreDomainSubpaths[rel(app.dir)] ?? [];
        if (!allowed.some((prefix) => subpath === prefix || subpath.startsWith(prefix))) {
          add("forbidden-core-subpath", file, specifier);
        }
      }
      if (rel(app.dir) === "apps/realtime" && /@orbit\/core\/(?:live-server|server\/ws|events\/types)/.test(specifier)) {
        add("realtime-core-protocol-import", file, specifier);
      }
    }
  }
}

for (const appPath of ["apps/control-api", "apps/edge-gateway", "apps/realtime", "apps/worker"]) {
  const lifecycleFile = join(repoRoot, appPath, "src", "database-runtime-lifecycle.service.ts");
  const appModuleFile = join(repoRoot, appPath, "src", "app.module.ts");
  if (!existsSync(lifecycleFile)) {
    add("missing-app-db-lifecycle", lifecycleFile, "long-running apps must close the shared database during Nest application shutdown");
    continue;
  }
  const lifecycleSource = readFileSync(lifecycleFile, "utf8");
  if (!/implements\s+OnApplicationShutdown/.test(lifecycleSource) || !/\bcloseDbInstance\s*\(/.test(lifecycleSource)) {
    add("invalid-app-db-lifecycle", lifecycleFile, "database lifecycle service must close the database in OnApplicationShutdown");
  }
  const appModuleSource = existsSync(appModuleFile) ? readFileSync(appModuleFile, "utf8") : "";
  if (!/providers\s*:\s*\[[^\]]*DatabaseRuntimeLifecycleService/s.test(appModuleSource)) {
    add("unregistered-app-db-lifecycle", appModuleFile, "register DatabaseRuntimeLifecycleService in the root module");
  }
}

const controlLocalProviderHealth = join(
  repoRoot,
  "apps/control-api/src/monitoring/local-provider-health.service.ts",
);
const edgeLocalProviderHealth = join(
  repoRoot,
  "apps/edge-gateway/src/runtime-control/local-provider-health.service.ts",
);
const edgeRuntimeControlModule = join(
  repoRoot,
  "apps/edge-gateway/src/runtime-control/runtime-control.module.ts",
);
const edgeRuntimeControlService = join(
  repoRoot,
  "apps/edge-gateway/src/runtime-control/runtime-control.service.ts",
);
if (existsSync(controlLocalProviderHealth)) {
  add(
    "local-provider-health-owned-by-control",
    controlLocalProviderHealth,
    "provider node probes must run from the edge request-plane network namespace",
  );
}
if (!existsSync(edgeLocalProviderHealth)) {
  add("missing-edge-local-provider-health-owner", edgeLocalProviderHealth);
} else {
  const source = readFileSync(edgeLocalProviderHealth, "utf8");
  if (
    !/implements\s+OnModuleInit\s*,\s*OnModuleDestroy/.test(source) ||
    !/\bgetCachedProviderNodes\b/.test(source) ||
    !/\bsetTimeout\s*\(/.test(source) ||
    !/\bclearTimeout\s*\(/.test(source)
  ) {
    add(
      "invalid-edge-local-provider-health-owner",
      edgeLocalProviderHealth,
      "edge must own provider polling state and timer lifecycle",
    );
  }
  const moduleSource = existsSync(edgeRuntimeControlModule)
    ? readFileSync(edgeRuntimeControlModule, "utf8")
    : "";
  const commandSource = existsSync(edgeRuntimeControlService)
    ? readFileSync(edgeRuntimeControlService, "utf8")
    : "";
  if (!/providers\s*:\s*\[[^\]]*LocalProviderHealthService/.test(moduleSource)) {
    add("unregistered-edge-local-provider-health-owner", edgeRuntimeControlModule);
  }
  if (!/localProviders:\s*localProviderHealth\.getAllHealthStatuses\(\)/.test(commandSource)) {
    add(
      "local-provider-health-missing-from-edge-command",
      edgeRuntimeControlService,
      "control must read the edge-owned snapshot through the authenticated runtime command",
    );
  }
}

const embeddedWsProxyFile = join(
  repoRoot,
  "apps/control-api/src/services/embedded-service-ws-proxy.ts",
);
const embeddedRuntimeOwnerFile = join(
  repoRoot,
  "apps/control-api/src/services/embedded-services-runtime.service.ts",
);
if (existsSync(embeddedWsProxyFile) && existsSync(embeddedRuntimeOwnerFile)) {
  const proxySource = readFileSync(embeddedWsProxyFile, "utf8");
  const ownerSource = readFileSync(embeddedRuntimeOwnerFile, "utf8");
  if (!/export\s+async\s+function\s+stopEmbedWsProxy\s*\(/.test(proxySource)) {
    add(
      "embedded-ws-listener-without-stop",
      embeddedWsProxyFile,
      "the control-owned sidecar listener must expose an idempotent shutdown operation",
    );
  }
  if (
    !/implements\s+OnModuleInit\s*,\s*OnModuleDestroy/.test(ownerSource) ||
    !/onModuleDestroy\s*\([^)]*\)[\s\S]*?stopEmbedWsProxy\s*\(/.test(ownerSource)
  ) {
    add(
      "unowned-embedded-ws-listener-lifecycle",
      embeddedRuntimeOwnerFile,
      "the Nest lifecycle owner must close the embedded WebSocket listener during shutdown",
    );
  }
}

// Shared packages must stay below apps; importing an app from packages would
// create a deployment cycle and silently couple independently deployable units.
const controlJobsContract = join(packagesRoot, "core", "src", "control", "jobs.ts");
if (existsSync(controlJobsContract) && /\bgetJobRegistry\b|\.\.\/lib\/jobRegistry\/index/.test(readFileSync(controlJobsContract, "utf8"))) {
  add("control-job-contract-exposes-worker-runtime", controlJobsContract, "control jobs contract must expose DB projections only");
}
const workerJobRegistry = join(appsRoot, "worker", "src", "jobs", "registry.ts");
if (existsSync(workerJobRegistry)) {
  const source = readFileSync(workerJobRegistry, "utf8");
  if (/\bdomainModule\s*\(|\bmodulePath\s*:/.test(source)) {
    add("opaque-worker-job-import", workerJobRegistry, "worker jobs must use literal lazy imports so dependency audits can inspect every boundary");
  }
  if (!/import\("@orbit\/core\/worker\/cloud-sync"\)[\s\S]*?exportName:\s*"ensureCloudSyncInitialized"/.test(source)) {
    add("missing-worker-cloud-sync-owner", workerJobRegistry, "worker must remain the explicit owner of cloud sync and job-registry startup");
  }
  if (!/import\("\.\/model-sync-scheduler\.js"\)[\s\S]*?exportName:\s*"startModelSyncScheduler"/.test(source)) {
    add("missing-worker-model-sync-owner", workerJobRegistry, "worker must remain the explicit owner of model-sync scheduler startup");
  }
  if (!/import\("\.\/memory-decay\.js"\)[\s\S]*?exportName:\s*"startMemoryDecayScheduler"/.test(source)) {
    add("missing-worker-memory-decay-scheduler", workerJobRegistry, "worker must own memory-decay cadence through its app-local scheduler");
  }
  if (/core\/worker\/typed-memory-decay/.test(source)) {
    add("worker-writes-edge-memory", workerJobRegistry, "worker must trigger memory maintenance through the authenticated edge command");
  }
}
const workerMemoryDecay = join(appsRoot, "worker", "src", "jobs", "memory-decay.ts");
if (!existsSync(workerMemoryDecay)) {
  add("missing-worker-memory-decay-client", workerMemoryDecay, "worker needs an app-local edge command scheduler");
} else {
  const source = readFileSync(workerMemoryDecay, "utf8");
  if (!/command:\s*["']memory\.decay["']/.test(source) || !/getInternalServiceAuthHeaders/.test(source)) {
    add("worker-memory-decay-bypasses-edge", workerMemoryDecay, "memory decay must use the authenticated edge runtime command");
  }
  if (/core\/(?:edge\/memory-decay|worker\/typed-memory-decay)|\b(?:DELETE|UPDATE|INSERT)\s+(?:FROM|INTO)?\s*memories\b/i.test(source)) {
    add("worker-memory-decay-direct-write", workerMemoryDecay, "worker owns only cadence and must not import the edge writer or issue memory SQL");
  }
}
const mcpMemoryTools = join(packagesRoot, "inference", "src", "mcp-server", "tools", "memoryTools.ts");
if (existsSync(mcpMemoryTools)) {
  const source = readFileSync(mcpMemoryTools, "utf8");
  if (/services\/memoryRuntime|\b(?:createMemory|deleteMemory|updateMemory|listMemories)\b/.test(source)) {
    add("mcp-memory-direct-write", mcpMemoryTools, "the CLI-owned MCP executable must use authenticated edge memory commands");
  }
  if (!/command:\s*["']memory\.(?:create|search|clear)["']/.test(source) || !/getInternalServiceAuthHeaders/.test(source)) {
    add("mcp-memory-bypasses-edge", mcpMemoryTools, "MCP memory tools must cross the authenticated edge command boundary");
  }
}
const controlAuthInit = join(packagesRoot, "core", "src", "control", "auth-init.ts");
if (
  existsSync(controlAuthInit) &&
  /initCloudSync|ensureCloudSyncInitialized|getJobRegistry|startModelSyncScheduler/.test(readFileSync(controlAuthInit, "utf8"))
) {
  add("control-init-starts-worker-runtime", controlAuthInit, "control /api/init must not start worker-owned schedulers or the job registry");
}
const retiredCoreModelSyncScheduler = join(packagesRoot, "core", "src", "shared", "services", "modelSyncScheduler.ts");
if (existsSync(retiredCoreModelSyncScheduler)) {
  add("worker-scheduler-in-core", retiredCoreModelSyncScheduler, "model-sync timer lifecycle belongs in apps/worker");
}
for (const modelSyncLeaf of ["modelSyncClient.ts", "modelSyncOperation.ts"]) {
  const file = join(packagesRoot, "core", "src", "shared", "services", modelSyncLeaf);
  if (existsSync(file) && /\bset(?:Timeout|Interval)\s*\(/.test(readFileSync(file, "utf8"))) {
    add("model-sync-lifecycle-in-shared-leaf", file, "neutral model-sync client and operation modules must not create timers");
  }
}
const coreDomainEntry = packageEntries.find(({ manifest }) => manifest?.name === "@orbit/core");
if (coreDomainEntry) {
  const proxySubscriptionService = join(
    coreDomainEntry.dir,
    "src/lib/proxySubscription/subscriptionService.ts",
  );
  if (
    existsSync(proxySubscriptionService) &&
    /\b(?:startSubscriptionScheduler|stopSubscriptionScheduler|setInterval)\b/.test(
      readFileSync(proxySubscriptionService, "utf8"),
    )
  ) {
    add(
      "proxy-subscription-lifecycle-in-core",
      proxySubscriptionService,
      "subscription CRUD and one-shot sync must not start the worker-owned refresh scheduler",
    );
  }
  const serializedExports = JSON.stringify(coreDomainEntry.manifest.exports ?? {});
  for (const declaration of walk(join(coreDomainEntry.dir, "src", "public")).filter((file) => file.endsWith(".d.ts"))) {
    const declarationPath = `./${relative(coreDomainEntry.dir, declaration).split(sep).join("/")}`;
    if (!serializedExports.includes(declarationPath)) {
      add("orphan-public-declaration", declaration, "public declarations must be referenced by a package export");
    }
  }
}
const retiredRedundantCoreExports = [
  "./catalog/runtime-support",
  "./edge/service-registry",
  "./shared/version-manager",
  "./shared/embedded-services",
  "./control/embedded-services-runtime-support",
  "./edge/local-db",
  "./db/local-db",
  "./control/database-settings",
  "./shared/api-key-policy",
  "./runtime/upstream-error",
  "./edge/request-id",
  "./shared/credential-health-cache",
  "./runtime/model-lockout-settings",
  "./edge/ws-cors",
  "./runtime/db-core",
  "./usage/reporting-support/database",
  "./shared/validation/providerSpecificData",
  "./shared/authz-route-guard",
  "./shared/authz-route-constants",
  "./control/models",
  "./control/provider-discovery-support/providers",
  "./usage/provider-limits-support/providers",
  "./catalog/provider-node-prefixes",
  "./shared/constants/providers",
  "./catalog/provider-metadata",
  "./edge/provider-constants",
  "./runtime/provider-constants",
  "./edge/usage-db",
  "./runtime/usage-db",
  "./edge/music-rate-limit",
  "./catalog/quota-runtime",
  "./control/synced-models",
  "./control/cost-rules",
  "./control/usage",
  "./control/cli-tools-config-generator",
  "./control/cli-tools-tool-detector",
  "./edge/credential-health-cache",
  "./edge/feature-flags",
  "./control/feature-flags",
  "./edge/rate-limit",
  "./resilience/rate-limit",
  "./control/modality-bridge-stats",
  "./control/video-bridge-runtime",
  "./edge/video-bridge-runtime",
  "./control/video-bridge-drilldown",
  "./shared/services/apiKeyResolver",
  "./control/cli-tools-api-key-resolver",
  "./edge/rerank-validation-helpers",
  "./edge/embeddings-validation-helpers",
  "./edge/moderation-validation-helpers",
  "./shared/validation-helpers",
  "./control/cli-tools-validation-helpers",
  "./models/index",
  "./shared/utils/bulkApiKeyParser",
  "./control/provider-discovery-support/modelSyncScheduler",
  "./control/model-sync-scheduler",
  "./shared/services/modelSyncScheduler",
  "./shared/pino-logger",
  "./control/settings",
  "./runtime/settings",
  "./control/provider-discovery-support/settings",
  "./usage/provider-limits-support/settings",
  "./usage/reporting-support/pricing",
  "./runtime/provider-connections",
  "./usage/provider-limits-support/providerConnections",
  "./usage/reporting-support/providers",
  "./worker/quota-cache",
  "./runtime/quota-cache",
  "./usage/provider-limits-support/quotaCache",
  "./domain/quotaCache",
  "./shared/circuit-breaker",
  "./control/resilience-circuit-breaker",
  "./edge/circuit-breaker",
  "./usage/reporting-support/shared/utils/circuitBreaker",
  "./edge/rerank-provider-nodes",
  "./edge/read-cache",
  "./runtime/read-cache",
  "./control/provider-discovery-support/localDb",
  "./usage/codex-reset-support/local-db",
  "./control/provider-discovery-support/modelsDb",
  "./db/models-runtime",
  "./runtime/models-db",
  "./control/resilience-settings",
  "./runtime/resilience-settings",
  "./control/provider-discovery-support/freeModels",
  "./shared/free-models",
  "./runtime/free-models",
  "./control/api-key-store",
  "./runtime/api-keys",
  "./db/session-account-affinity",
  "./worker/session-affinity",
  "./runtime/session-affinity-db",
  "./edge/claude-extra-usage",
  "./usage/provider-limits-support/claudeExtraUsage",
  "./db/quota-snapshots",
  "./usage/reporting-support/quota-snapshots",
  "./shared/utilization",
  "./usage/reporting-support/shared/types/utilization",
  "./runtime/detailed-logs",
  "./runtime/proxy-logs",
  "./runtime/provider-connection-view",
  "./runtime/context-handoffs",
  "./runtime/exclusive-leases",
  "./runtime/proxies",
  "./control/openrouter-provider-stats",
  "./worker/openrouter-provider-stats",
  "./usage/provider-limits-support/providerLimits",
  "./quota/types",
  "./quota/scheduler",
  "./quota/spend-recorder",
  "./runtime/middleware-registry",
  "./control/middleware-registry",
  "./control/provider-discovery-support/callLogs",
  "./usage/reporting-support/call-logs",
  "./control/compliance",
  "./worker/compliance",
  "./compliance",
  "./shared/combo-steps",
  "./edge/mcp-combo-steps",
  "./control/cli-tools-combo",
  "./shared/probe-origin",
  "./edge/probe-origin",
  "./runtime/probe-origin",
  "./edge/video-bridge-stats",
  "./runtime/modality-bridge-stats",
  "./shared/auto-disable-banned",
  "./runtime/auto-disable-banned",
  "./control/proxy-logs",
  "./shared/proxy-log-settings",
  "./shared/services/cliRuntime",
  "./control/cli-tools-runtime",
  "./shared/services/backupService",
  "./control/cli-tools-backups",
  "./shared/cli-tool-config-status",
  "./control/cli-tools-status",
  "./pricing/modal-cost",
  "./usage/reporting-support/cost-calculator",
  "./control/proxy-subscriptions",
  "./worker/proxy-subscription",
  "./control/radar",
  "./control/radar-db",
  "./control/radar-sync",
  "./control/radar-referrals-sync",
  "./control/radar-offers-sync",
  "./control/radar-intel-sync",
  "./worker/radar-scheduler",
  "./middleware/pre-request-hook-management",
  "./edge/guardrails-runtime",
  "./runtime/guardrails",
];
for (const subpath of retiredRedundantCoreExports) {
  if (coreDomainEntry?.manifest?.exports?.[subpath]) {
    add("redundant-core-export", join(coreDomainEntry.dir, "package.json"), subpath);
  }
}
const callLogArtifactsExport = coreDomainEntry?.manifest?.exports?.["./usage/call-log-artifacts"];
if (
  callLogArtifactsExport &&
  typeof callLogArtifactsExport === "object" &&
  (callLogArtifactsExport.import === "./src/lib/usage/callLogArtifacts.ts" ||
    callLogArtifactsExport.types === "./src/public/usageRuntime.d.ts")
) {
  add(
    "broad-call-log-artifacts-export",
    join(coreDomainEntry.dir, "package.json"),
    "usage/call-log-artifacts must remain a physical read-only contract",
  );
}
const retiredAppOwnedExports = [
  "./worker/memory",
  "./worker/typed-memory-decay",
  "./worker/proxy-subscription-lifecycle",
  "./worker/connection-recovery-lifecycle",
  "./worker/model-sync-lifecycle",
  "./worker/pricing-sync-lifecycle",
  "./worker/database-cleanup-lifecycle",
  "./worker/database-vacuum-lifecycle",
  "./control/env-repair",
  "./shared/client-api-auth",
  "./control/provider-test-batch",
  "./edge/relay-bifrost",
  "./catalog/project-combo",
  "./control/free-onboarding",
  "./control/gateway-status",
  "./control/routing-preview",
  "./control/copilot",
  "./control/telegram",
  "./control/playground-prompt-improver",
  "./chaos/config",
  "./chaos/executor",
  "./control/acp",
  "./cli/log-streamer",
  "./cli/windows-process",
  "./edge/vscode-token",
  "./edge/vscode-service-tier",
  "./edge/vscode-models",
  "./edge/vscode-ollama",
  "./edge/vscode-combos",
  "./control/video-bridge-extract",
  "./control/issue-agent",
  "./control/headroom",
  "./control/network-info",
  "./edge/v1beta-models",
  "./runtime/build-sha",
  "./control/oauth-runtime/antigravityProjectGate",
  "./control/cli-tools-batch-cache",
  "./control/local-redis",
  "./control/oauth-runtime/deviceFlowTickets",
  "./edge/fleet-skills",
  "./edge/vscode-token-combos",
  "./edge/ws-path",
  "./shared/utils/compressionHeaderEcho",
  "./control/radar-supporter-key",
  "./control/provider-discovery-support/vertexAnthropicModelsParser",
  "./shared/utils/codexBaseUrl",
  "./shared/utils/codexConfig",
  "./shared/services/claudeCliConfig",
  "./shared/turkish-text",
  "./shared/utils/turkishText",
  "./conductor/faro-proxy",
  "./control/local-endpoints",
  "./control/provider-discovery-support/geminiModelsParser",
  "./control/provider-discovery-support/ollamaCapabilities",
  "./shared/node-runtime-support",
  "./shared/validation/free-proxy-schemas",
  "./shared/services/droidCustomModels",
  "./catalog/provider-credential-requirement",
  "./shared/services/opencodeConfig",
  "./control/cli-tools-mitm-alias",
  "./control/provider-expiration",
  "./control/resilience-types",
  "./control/oauth-runtime/kiroConnectionIdentity",
  "./shared/validation/compression-config-schemas",
  "./shared/combo-test",
  "./control/login-guard",
  "./domain/degradation",
  "./control/radar-links",
  "./quota/schemas",
  "./control/oauth-runtime/pasteCredentials",
  "./edge/chat-admission",
  "./control/provider-display-names",
  "./worker/jobs",
  "./worker/auxiliary-scheduler-support",
  "./worker/credential-health-support",
  "./worker/lib/conductor/boot.ts",
  "./worker/lib/proxyHealth/scheduler.ts",
  "./worker/lib/freeProxyProviders/scheduler.ts",
];
for (const subpath of retiredAppOwnedExports) {
  if (coreDomainEntry?.manifest?.exports?.[subpath]) {
    add("app-owned-capability-exported-by-core", join(coreDomainEntry.dir, "package.json"), subpath);
  }
}
for (const relativeFile of ["src/lib/db/cleanup.ts", "src/lib/db/vacuum.ts"]) {
  const file = join(coreDomainEntry?.dir ?? join(packagesRoot, "core"), relativeFile);
  if (existsSync(file) && /\b(?:setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/.test(readFileSync(file, "utf8"))) {
    add(
      "database-maintenance-lifecycle-in-core",
      file,
      "database cleanup and vacuum timers belong to apps/worker/jobs",
    );
  }
}
{
  const file = join(coreDomainEntry?.dir ?? join(packagesRoot, "core"), "src/lib/db/core.ts");
  const source = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (/\b(?:setInterval|clearInterval)\s*\(/.test(source)) {
    add(
      "database-connection-owns-maintenance-lifecycle",
      file,
      "database connection acquisition must not schedule health checks or WAL checkpoints; apps/worker owns those timers",
    );
  }
  const getDbBody = source.slice(
    source.indexOf("export function getDbInstance"),
    source.indexOf("export function pingDb"),
  );
  if (/\brunDbHealthCheck\s*\(/.test(getDbBody)) {
    add(
      "database-connection-runs-health-maintenance",
      file,
      "database connection acquisition must not run repair or integrity maintenance; apps/worker owns startup health maintenance",
    );
  }
  const workerRegistry = join(repoRoot, "apps/worker/src/jobs/registry.ts");
  if (
    !existsSync(workerRegistry) ||
    !/name:\s*["']database-health-maintenance["']/.test(readFileSync(workerRegistry, "utf8"))
  ) {
    add(
      "missing-worker-database-health-maintenance",
      workerRegistry,
      "worker registry must own database health-check and WAL checkpoint scheduling",
    );
  }
}
for (const relativeFile of ["src/lib/modelsDevSync.ts", "src/lib/pricingSync.ts"]) {
  const file = join(coreDomainEntry?.dir ?? join(packagesRoot, "core"), relativeFile);
  if (existsSync(file) && /\b(?:setInterval|clearInterval)\s*\(/.test(readFileSync(file, "utf8"))) {
    add("sync-lifecycle-in-core", file, "model and pricing sync timers belong to apps/worker/jobs");
  }
}
{
  const file = join(coreDomainEntry?.dir ?? join(packagesRoot, "core"), "src/lib/quota/connectionRecovery.ts");
  if (existsSync(file) && /\b(?:setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/.test(readFileSync(file, "utf8"))) {
    add("connection-recovery-lifecycle-in-core", file, "connection recovery timers belong to apps/worker/jobs");
  }
}
const openSseEntry = packageEntries.find(({ manifest }) => manifest?.name === "@orbit/inference");
if (openSseEntry?.manifest?.exports?.["./oauth/codex-device-completion"]) {
  add(
    "control-only-capability-exported-by-inference",
    join(openSseEntry.dir, "package.json"),
    "./oauth/codex-device-completion",
  );
}
{
  const cliRuntime = join(repoRoot, "apps/cli/src/cli/runtime.mjs");
  const cliCombo = join(repoRoot, "apps/cli/src/cli/commands/combo.mjs");
  const runtimeSource = existsSync(cliRuntime) ? readFileSync(cliRuntime, "utf8") : "";
  const comboSource = existsSync(cliCombo) ? readFileSync(cliCombo, "utf8") : "";
  if (
    /runtime\/recovery-db/.test(runtimeSource) ||
    /\b(?:createCombo|deleteComboByName|setActiveCombo|updateCombo)\b/.test(runtimeSource)
  ) {
    add(
      "cli-runtime-exposes-db-mutations",
      cliRuntime,
      "CLI runtime fallback may expose read-only queries only; runtime mutations belong to control-api",
    );
  }
  if (/\bdb\.combos\.(?:createCombo|deleteComboByName|setActiveCombo|updateCombo)\s*\(/.test(comboSource)) {
    add(
      "cli-combo-writes-control-owned-db",
      cliCombo,
      "CLI combo mutations must use the control-api and fail when it is offline",
    );
  }
}
for (const pkg of packageEntries) {
  const declared = new Set(Object.keys({ ...(pkg.manifest?.dependencies ?? {}), ...(pkg.manifest?.devDependencies ?? {}), ...(pkg.manifest?.optionalDependencies ?? {}) }));
  for (const name of declared) {
    if (appByName.has(name)) add("package-workspace-depends-on-app", join(pkg.dir, "package.json"), `${pkg.manifest?.name ?? rel(pkg.dir)} -> ${name}`);
  }
  for (const file of walk(pkg.dir)) {
    const source = readFileSync(file, "utf8");
    if (legacyNames.some((name) => source.includes(name))) add("retired-runtime-reference", file);
    for (const match of source.matchAll(importRe)) {
      const specifier = match[1] ?? match[2] ?? "";
      if (specifier === quotaCacheLifecycleSpecifier) {
        add(
          "quota-cache-lifecycle-in-shared-package",
          file,
          "shared packages may query or update quota cache state but must not own its scheduler",
        );
      }
      if (specifier === complianceLifecycleSpecifier) {
        add(
          "compliance-lifecycle-in-shared-package",
          file,
          "shared packages may use audit-log operations but must not invoke compliance lifecycle",
        );
      }
      if (specifier === sessionAffinityCleanupLifecycleSpecifier) {
        add(
          "session-affinity-cleanup-lifecycle-in-shared-package",
          file,
          "shared packages may read and write session affinity but must not own its cleanup scheduler",
        );
      }
      if (specifier === openRouterProviderStatsLifecycleSpecifier) {
        add(
          "openrouter-provider-stats-lifecycle-in-shared-package",
          file,
          "shared packages may read provider stats but must not own the refresh scheduler",
        );
      }
      if (specifier === radarSyncLifecycleSpecifier) {
        add(
          "radar-sync-lifecycle-in-shared-package",
          file,
          "shared packages may use Radar data and sync capabilities but must not own its scheduler",
        );
      }
      if (specifier === guardrailManagementSpecifier) {
        add(
          "guardrail-management-in-shared-package",
          file,
          "shared packages may evaluate guardrails but must not manage the mutable registry",
        );
      }
      if (
        specifier === preRequestHookExecutionSpecifier &&
        pkg.manifest?.name !== "@orbit/inference"
      ) {
        add(
          "pre-request-hook-execution-outside-inference",
          file,
          "only inference may execute persisted pre-request hooks for the edge request path",
        );
      }
      const workspace = workspaceByName.get(specifier) ?? [...workspaceByName.entries()].find(([name]) => specifier.startsWith(`${name}/`))?.[1];
      if (workspace && appByName.has(workspace.manifest.name)) add("package-imports-app", file, specifier);
    }
  }
}

const report = {
  status: violations.length ? "FAIL" : "PASS",
  apps: appEntries.map(({ dir, manifest }) => {
    const path = rel(dir);
    const appViolations = violations.filter((item) => item.file === path || item.file.startsWith(`${path}/`));
    return { name: manifest?.name ?? null, path, status: appViolations.length ? "FAIL" : "PASS", violations: appViolations.length };
  }),
  packages: packageEntries.map(({ dir, manifest }) => ({ name: manifest?.name ?? null, path: rel(dir) })),
  rules: [
    "apps may depend on shared packages, never another app",
    "apps may not use relative imports into packages or sibling apps",
    "packages may not import apps",
    "apps may consume only their allow-listed core subpaths",
    "migrated route files must exist only under their owning app",
    "A2A transport and task routes belong only to apps/edge-gateway",
    "realtime WebSocket implementation and export belong only to apps/realtime",
    "http exposes no app factory or surface selector",
    "control-api cannot import the worker-owned JobRegistry runtime",
    "core control jobs contract cannot expose the worker-owned registry",
    "migrated app-owned capabilities cannot be re-exported by core",
    "long-running Nest apps own final database shutdown",
    "CLI runtime fallback is read-only; control-api owns runtime configuration mutations",
    "legacy runtime package names are retired",
  ],
  violations,
};
console.log(JSON.stringify(report, null, 2));
if (strict && report.status !== "PASS") process.exitCode = 1;
