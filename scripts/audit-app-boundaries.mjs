#!/usr/bin/env node

/**
 * Validate the monorepo dependency boundary.
 *
 * Apps are deployable units. They may consume shared packages, but must not
 * import another app or reach into a package's source tree through a relative
 * path. Runtime implementation belongs to an explicit domain package (for
 * example core-domain); the retired legacy runtime split is
 * intentionally rejected.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const appsRoot = join(repoRoot, "apps");
const packagesRoot = join(repoRoot, "packages");
const sourceExtensions = /\.(?:[cm]?[jt]sx?|json)$/i;
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const legacyNames = ["gateway" + "-runtime", "server" + "-runtime"];
const violations = [];

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
// Keep package internals behind a small, reviewable surface. The core-domain
// package exposes implementation subpaths only where an app has an explicit
// ownership contract; all other app imports must go through explicit package
// contracts. Deployable construction stays in each app.
const allowedCoreDomainSubpaths = {
  "apps/realtime": ["startup", "events/eventBus", "shared/test-process", "shared/http-client-abort-guard", "sse/auth", "db/compression-analytics"],
  "apps/worker": ["startup", "worker/", "db/local-db"],
  "apps/control-api": ["startup", "runtime/request", "domain/degradation", "db/ping", "db/health", "db/call-log-stats", "db/provider-connections", "db/model-aliases", "db/local-db", "db/provider-stats", "db/database-stats", "db/vacuum-scheduler", "catalog/provider-metadata", "catalog/provider-registry", "catalog/provider-node-prefixes", "pricing/db", "pricing/defaults", "pricing/sync", "pricing/provider-prefixes", "pricing/validation", "pricing/modal-cost", "cache/db", "cache/services", "db/compression-analytics", "analytics/auto-routing-db", "analytics/diversity", "db-backups/db", "db-backups/validation", "metrics/combo", "metrics/request-telemetry", "metrics/observability", "metrics/tool-latency", "shared/numeric", "open-sse/utils/error.ts", "open-sse/services/deviceTracker.ts", "control/management-auth", "control/middleware-registry", "control/provider-credentials", "control/lkgp-cache", "control/management-password", "control/compliance", "control/feature-flags", "control/provider-validation", "control/provider-validation-schemas", "control/model-context-overrides", "control/model-test-data", "db/provider-nodes", "network/outbound-url-guard-policy", "network/safe-outbound-fetch", "control/gateway-status", "control/authenticated", "control/registered-keys", "control/synced-models", "control/settings", "memory/settings", "memory/runtime", "control/database-settings", "control/proxy-logs", "control/openrouter-provider-stats", "control/provider-health-matrix", "control/provider-expiration", "control/resilience-settings", "edge/usage-db", "db/detailed-logs", "db/proxy-logs", "shared/log-env", "control/api-key-store", "control/cloud-sync", "control/api-key-exposure", "db/api-key-groups", "control/api-key-usage-limits", "shared/", "sse/logger", "sse/auth", "evals/db", "evals/runner", "evals/runtime", "evals/validation", "db/api-keys", "db/batches", "plugins/db", "plugins/manager", "plugins/marketplace", "shared/cors", "quota/schemas", "quota/db", "quota/services", "quota/state", "compliance", "shared/combo-invariants", "catalog/combo-targets", "catalog/model-metadata", "catalog/provider-models"],
  "apps/edge-gateway": [
    "startup",
    "runtime/request",
    "edge/batches-validation-schemas",
    "middleware/prompt-injection",
    "sse/auth",
    "sse/logger",
    "edge/chat-handler",
    "edge/chat-admission",
    "edge/responses-runtime",
    "edge/codex-responses-ws-runtime",
    "edge/relay-bifrost",
    "edge/relay-chat",
    "edge/service-registry",
    "edge/vscode-token",
    "edge/vscode-models",
    "edge/vscode-ollama",
    "edge/vscode-combos",
    "edge/vscode-service-tier",
    "control/settings",
    "edge/count-tokens-validation",
    "control/authenticated",
    "shared/api-key-policy",
    "shared/upstream-error",
    "shared/validation/schemas",
    "shared/validation/helpers",
    "shared/connection-isolation",
    "shared/tokenizer",
    "edge/music-rate-limit",
    "edge/media-generation",
    "edge/specialty-catalog",
    "edge/rerank-validation-schemas",
    "edge/rerank-validation-helpers",
    "edge/rerank-provider-nodes",
    "edge/usage-db",
    "pricing/modal-cost",
    "edge/gateway-response-meta",
    "edge/request-id",
    "edge/local-db",
    "catalog/project-combo",
    "edge/image-route-model",
    "edge/synced-endpoint-routing",
    "shared/body-size-guard",
    "shared/client-api-auth",
    "shared/authz-headers",
    "edge/read-cache",
    "shared/designer-web-retirement",
    "shared/chatgpt-web-retirement",
    "db/api-keys",
    "db/files",
    "db/batches",
    "db/combos",
    "edge/embeddings-service",
    "edge/embeddings-handler",
    "edge/feature-flags",
    "edge/embeddings-validation-schemas",
    "edge/embeddings-validation-helpers",
    "edge/moderation-validation-schemas",
    "edge/moderation-validation-helpers",
    "edge/rate-limit",
    "control/synced-models",
    "usage/call-log-api-key-context",
    "sse/image-credential-retry",
    "edge/ws-cors",
    "edge/ws-path",
    "edge/ws-handshake",
    "db/ping",
    "db/encryption",
    "db/provider-connections",
    "edge/provider-constants",
    "control/provider-discovery-support/exclusiveLeaseIsolation",
    "db/upstream-proxy",
    "control/management-auth",
    "shared/cors-status",
    "network/remote-image-fetch",
    "catalog/unified",
    "catalog/providers",
    "shared/embedded-services",
    "shared/compatible-provider-id",
    "control/video-bridge-drilldown",
    "control/modality-bridge-stats",
    "control/video-bridge-runtime",
    "control/video-bridge-extract",
    "shared/error-response",
    "shared/constants/selfServiceScopes",
    "control/cost-rules",
    "edge/provider-limits",
    "edge/internal-usage",
    "shared/cors",
    "shared/validation-helpers",
    "edge/v1beta-models",
    // A2A transport is app-owned; core exposes only the transport-neutral task runtime.
    "a2a/runtime",
  ],
};

allowedCoreDomainSubpaths["apps/control-api"].push("db/health");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "domain/provider-error-classifier",
  "usage/reporting-support/",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "db/agentic-conversations",
  "usage/summary",
  "catalog/provider-credential-requirement",
  "edge/credential-health-cache",
  "resilience/model-lockout-settings",
  "db/upstream-proxy",
  "control/cli-token-auth",
  "db/tier-config",
);
allowedCoreDomainSubpaths["apps/edge-gateway"].push("shared/services/modelSyncScheduler");
allowedCoreDomainSubpaths["apps/control-api"].push("db/files");
allowedCoreDomainSubpaths["apps/control-api"].push("control/guardrails", "control/local-endpoints", "control/auth-init");
allowedCoreDomainSubpaths["apps/control-api"].push("control/assessment", "control/policies");
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-management");
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-connection");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/provider-discovery-support/",
  "control/fallback-policy",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/skills-github", "control/skills-executor");
// Host tunnel processes belong to the public edge runtime. Control may only
// reach them through the authenticated internal tunnel command contract.
allowedCoreDomainSubpaths["apps/edge-gateway"].push("edge/tunnels");
allowedCoreDomainSubpaths["apps/edge-gateway"].push(
  "shared/public-safe-error",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/jobs");
allowedCoreDomainSubpaths["apps/control-api"].push("control/network-info");
allowedCoreDomainSubpaths["apps/control-api"].push("control/free-provider-rankings");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/env-repair",
  "control/telegram",
  "control/intelligence-sync",
  "control/routing-preview",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/usage",
  "edge/provider-limits",
  "pricing/modal-cost",
  "usage/combo-health",
);

allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/provider-test-batch",
  "control/token-health-check",
  "control/oauth-gitlab",
  "lib/providers/chatgptWebRetirementResponse",
  "control/acp",
  "conductor/faro-proxy",
  "conductor/hub-proxy",
  "chaos/config",
  "chaos/executor",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/cli-access-tokens",
  "control/cli-access-scopes",
  "control/login-guard",
  "control/access-token-auth",
  "control/provider-model-store",
  "control/provider-model-aliases",
);
allowedCoreDomainSubpaths["apps/control-api"].push(
  "catalog/display-names",
  "catalog/managed-available-models",
  "catalog/model-capabilities",
  "catalog/models-dev-sync",
  "catalog/provider-models",
  "catalog/providers",
  "db/encryption",
  "db/webhook-deliveries",
  "shared/webhook-dispatcher",
  "shared/webhook-events",
  "shared/webhook-integrations/",
  "control/api-key-auth",
  "shared/auto-disable-banned",
  "shared/node-runtime-support",
  "shared/free-models",
  "shared/cors-status",
  "edge/feature-flags",
  "control/radar",
  "control/radar-db",
  "control/radar-sync",
  "control/radar-referrals-sync",
  "control/radar-offers-sync",
  "control/radar-intel-sync",
  "control/radar-links",
  "control/radar-supporter-key",
  "worker/lib/radar/scheduler.ts",
  "worker/lib/db/cleanup.ts",
  "usage/call-logs",
  "shared/authz-route-constants",
  "db/provider-cc-alias",
  "db/provider-interception-rules",
  "db/provider-param-filters",
  "control/web-session-contract",
  "control/provider-auth-import",
  "control/free-onboarding",
  "control/cursor-availability",
  "control/provider-health-autopilot",
  "control/dario-installer",
  "control/cliproxy",
  "control/mux",
  "control/compression-settings",
  "control/compression-combos",
  "control/compression-judge-client",
  "control/cost-rules",
  "control/qdrant",
  "db/compression-run-telemetry",
  "shared/validation/compression-config-schemas",
  "control/reasoning-routing",
  "shared/local-corpus",
  "control/notion-db",
  "control/notion-client",
  "control/obsidian-db",
  "control/obsidian-client",
  "control/obsidian-sync",
  "control/oauth-runtime/",
  "control/models",
  "control/model-management",
  "control/traffic-inspector",
  "control/agent-bridge",
  "control/build-phase",
  "control/cursor-token-extractor",
  "control/cursor-renewal",
  "control/kimi-token-refresh",
  "control/provider-auth-files/",
  "control/gamification",
  "control/gamification-db",
  "usage/cache-health",
  "usage/provider-window-costs",
  "usage/codex-reset-credits",
  "usage/combo-forecast",
  "usage/combo-health-dashboard",
  "usage/combo-health-autopilot",
  "usage/combo-scoring-inspector",
    "usage/route-explain",
    "db/quota-snapshots",
  "shared/utilization",
  "shared/embedded-services",
  "control/sync-bundle",
  "control/sync-tokens",
  "control/cloud-sync-initialize",
  "control/model-sync-scheduler",
  "control/skills-registry",
  "control/skills-github",
  "control/agent-skills",
  "control/provider-display-names",
  "control/mcp-management",
  "control/copilot",
  "control/issue-agent",
  "control/proxy-subscriptions",
  "control/model-capability-overrides",
  "control/model-context-overrides",
  "pricing/provider-prefixes",
  "shared/reasoning-efforts-override",
  "edge/rate-limit",
);
allowedCoreDomainSubpaths["apps/control-api"].push("catalog/providers");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/resilience-circuit-breaker",
  "control/model-availability",
  "control/resilience-connection-recovery",
  "control/resilience-types",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/guardrails");
allowedCoreDomainSubpaths["apps/control-api"].push("control/headroom", "db/relayProxies", "shared/validation");
allowedCoreDomainSubpaths["apps/control-api"].push("db/cc-discovery-metrics");
allowedCoreDomainSubpaths["apps/control-api"].push(
  "control/playground-presets",
  "control/playground-prompt-improver",
  "shared/schemas/playground",
  "control/cli-tools-",
);
allowedCoreDomainSubpaths["apps/control-api"].push("control/provider-management");
allowedCoreDomainSubpaths["apps/control-api"].push("control/embedded-services-runtime-support");

// Route files that have completed a physical ownership move. Keep this list
// small and explicit: adding an entry is the acceptance record for a domain
// migration, and the old core-domain copy must be gone.
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
    "api/auth/status/route.ts",
    "api/auth/csrf/route.ts",
    "api/auth/login/route.ts",
    "api/auth/logout/route.ts",
    "api/auth/oidc/login/route.ts",
    "api/auth/oidc/callback/route.ts",
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
    "api/shutdown/route.ts",
    "api/restart/route.ts",
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
    "api/v1/search/analytics/route.ts",
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
    "api/settings/require-login/route.ts",
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
const coreDomain = packageEntries.find((entry) => entry.manifest?.name === "@shiguang-gateway/core-domain");
if (coreDomain) {
  const exportsMap = coreDomain.manifest?.exports ?? {};
  for (const exportPath of Object.keys(exportsMap)) {
    if (exportPath.includes("live-server") || exportPath.includes("server/ws")) {
      add("core-domain-realtime-export", join(coreDomain.dir, "package.json"), exportPath);
    }
  }
  const legacyRealtimeDir = join(coreDomain.dir, "src", "server", "ws");
  if (existsSync(legacyRealtimeDir)) {
    add("core-domain-realtime-implementation", legacyRealtimeDir, "live WebSocket code must live in apps/realtime");
  }
  const coreApiRoot = join(coreDomain.dir, "src", "app", "api");
  for (const file of walk(coreApiRoot)) {
    const route = relative(coreApiRoot, file).split(sep).join("/");
    if (/^(live|events|realtime)(\/|$)/.test(route)) {
      add("core-domain-realtime-route", file, "realtime HTTP/SSE routes must live in apps/realtime");
    }
  }
}

for (const legacy of legacyNames) {
  const dir = join(packagesRoot, legacy);
  if (existsSync(dir)) add("retired-runtime-directory", dir, `packages/${legacy} must be removed`);
}

// The shared HTTP package must never regain a generic app factory or a
// caller-selected surface. Those APIs collapse independently deployable apps
// back into one parameterized runtime.
const httpKernel = packageEntries.find((entry) => entry.manifest?.name === "@shiguang-gateway/http-kernel");
if (httpKernel) {
  for (const file of walk(join(httpKernel.dir, "src"))) {
    const source = readFileSync(file, "utf8");
    if (/create(?:EdgeGateway|ControlApi|Nest)Application|register(?:EdgeGateway|ControlApi)Infrastructure/.test(source)) {
      add("parameterized-http-app-factory", file, "HTTP app construction belongs to apps/*");
    }
    if (/\bsurface\s*[?:]/.test(source)) {
      add("http-kernel-surface-selector", file, "shared transport must not select an app boundary");
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

const coreRouteRoot = join(packagesRoot, "core-domain", "src", "app");
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
    if (rel(app.dir) === "apps/control-api" && /\bgetJobRegistry\b|@shiguang-gateway\/core-domain\/worker\/jobs/.test(source)) {
      add("control-imports-worker-job-runtime", file, "control-api may only read job projections and send versioned worker commands");
    }
    if (legacyNames.some((name) => source.includes(name))) add("retired-runtime-reference", file);
    for (const match of source.matchAll(importRe)) {
      const specifier = match[1] ?? match[2] ?? "";
      if (specifier.startsWith(".")) {
        const target = resolve(file, "..", specifier);
        if (target.includes(`${sep}apps${sep}`) && !target.startsWith(`${app.dir}${sep}`)) add("cross-app-relative-import", file, specifier);
        if (target.includes(`${sep}packages${sep}`)) add("package-source-relative-import", file, specifier);
      }
      const workspace = workspaceByName.get(specifier) ?? [...workspaceByName.entries()].find(([name]) => specifier.startsWith(`${name}/`))?.[1];
      if (workspace && appByName.has(workspace.manifest.name)) add("cross-app-import", file, specifier);
      if (workspace && !declared.has(workspace.manifest.name)) add("undeclared-workspace-import", file, specifier);
      if (specifier.startsWith("@shiguang-gateway/core-domain/")) {
        const subpath = specifier.slice("@shiguang-gateway/core-domain/".length);
        const allowed = allowedCoreDomainSubpaths[rel(app.dir)] ?? [];
        if (!allowed.some((prefix) => subpath === prefix || subpath.startsWith(prefix))) {
          add("forbidden-core-domain-subpath", file, specifier);
        }
      }
      if (rel(app.dir) === "apps/realtime" && /@shiguang-gateway\/core-domain\/(?:live-server|server\/ws|events\/types)/.test(specifier)) {
        add("realtime-core-protocol-import", file, specifier);
      }
    }
  }
}

// Shared packages must stay below apps; importing an app from packages would
// create a deployment cycle and silently couple independently deployable units.
const controlJobsContract = join(packagesRoot, "core-domain", "src", "control", "jobs.ts");
if (existsSync(controlJobsContract) && /\bgetJobRegistry\b|\.\.\/lib\/jobRegistry\/index/.test(readFileSync(controlJobsContract, "utf8"))) {
  add("control-job-contract-exposes-worker-runtime", controlJobsContract, "control jobs contract must expose DB projections only");
}
const coreDomainEntry = packageEntries.find(({ manifest }) => manifest?.name === "@shiguang-gateway/core-domain");
const retiredAppOwnedExports = [
  "./runtime/build-sha",
  "./control/oauth-runtime/antigravityProjectGate",
  "./control/cli-tools-batch-cache",
  "./control/local-redis",
  "./control/oauth-runtime/deviceFlowTickets",
  "./edge/fleet-skills",
  "./edge/vscode-token-combos",
];
for (const subpath of retiredAppOwnedExports) {
  if (coreDomainEntry?.manifest?.exports?.[subpath]) {
    add("app-owned-capability-exported-by-core-domain", join(coreDomainEntry.dir, "package.json"), subpath);
  }
}
const openSseEntry = packageEntries.find(({ manifest }) => manifest?.name === "@shiguang-gateway/open-sse");
if (openSseEntry?.manifest?.exports?.["./oauth/codex-device-completion"]) {
  add(
    "control-only-capability-exported-by-open-sse",
    join(openSseEntry.dir, "package.json"),
    "./oauth/codex-device-completion",
  );
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
    "apps may consume only their allow-listed core-domain subpaths",
    "migrated route files must exist only under their owning app",
    "A2A transport and task routes belong only to apps/edge-gateway",
    "realtime WebSocket implementation and export belong only to apps/realtime",
    "http-kernel exposes no app factory or surface selector",
    "control-api cannot import the worker-owned JobRegistry runtime",
    "core-domain control jobs contract cannot expose the worker-owned registry",
    "migrated app-owned capabilities cannot be re-exported by core-domain",
    "legacy runtime package names are retired",
  ],
  violations,
};
console.log(JSON.stringify(report, null, 2));
if (strict && report.status !== "PASS") process.exitCode = 1;
