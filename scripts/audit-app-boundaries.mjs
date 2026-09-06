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
  "apps/control-api": ["startup", "runtime/request", "domain/degradation", "db/ping", "db/call-log-stats", "db/provider-connections", "db/model-aliases", "db/local-db", "db/provider-stats", "catalog/provider-metadata", "catalog/provider-registry", "catalog/provider-node-prefixes", "pricing/db", "pricing/defaults", "pricing/sync", "pricing/provider-prefixes", "pricing/validation", "cache/db", "cache/services", "db/compression-analytics", "analytics/auto-routing-db", "analytics/diversity", "db-backups/db", "db-backups/validation", "metrics/combo", "metrics/request-telemetry", "metrics/tool-latency", "shared/numeric", "open-sse/utils/error.ts", "open-sse/services/deviceTracker.ts", "control/management-auth", "control/management-password", "control/compliance", "control/feature-flags", "control/provider-validation", "control/provider-validation-schemas", "control/provider-model-store", "control/provider-model-aliases", "control/model-context-overrides", "control/model-test-data", "db/provider-nodes", "network/outbound-url-guard-policy", "network/safe-outbound-fetch", "control/gateway-status", "control/authenticated", "control/synced-models", "control/settings", "memory/settings", "memory/runtime", "control/database-settings", "control/proxy-logs", "control/openrouter-provider-stats", "control/provider-health-matrix", "control/provider-expiration", "control/resilience-settings", "edge/usage-db", "db/detailed-logs", "db/proxy-logs", "shared/log-env", "control/api-key-store", "control/cloud-sync", "control/api-key-exposure", "db/api-key-groups", "control/api-key-usage-limits", "shared/", "sse/logger", "evals/db", "evals/runner", "evals/runtime", "evals/validation", "db/api-keys", "plugins/db", "plugins/manager", "plugins/marketplace", "shared/cors", "quota/schemas", "quota/db", "quota/services", "compliance", "shared/combo-invariants", "catalog/combo-targets", "catalog/model-metadata", "catalog/provider-models"],
  "apps/edge-gateway": [
    "startup",
    "runtime/request",
    "edge/image-generations-handler",
    "edge/batches-validation-schemas",
    "middleware/prompt-injection",
    "sse/auth",
    "sse/logger",
    "control/authenticated",
    "shared/api-key-policy",
    "shared/upstream-error",
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
    "edge/image-route-model",
    "shared/body-size-guard",
    "edge/read-cache",
    "shared/designer-web-retirement",
    "shared/chatgpt-web-retirement",
    "db/api-keys",
    "db/files",
    "db/batches",
    "edge/embeddings-service",
    "edge/embeddings-handler",
    "edge/feature-flags",
    "edge/embeddings-validation-schemas",
    "edge/embeddings-validation-helpers",
    "edge/moderation-validation-schemas",
    "edge/moderation-validation-helpers",
    "edge/rate-limit",
    "edge/ws-cors",
    "edge/ws-path",
    "edge/ws-handshake",
    "network/remote-image-fetch",
    // A2A transport is owned by edge-gateway; these explicit dynamic imports
    // are transitional facades for the legacy skill implementation while its
    // provider/DB dependencies are moved into edge-owned modules.
    "a2a/legacy-",
  ],
};

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
);

// Route files that have completed a physical ownership move. Keep this list
// small and explicit: adding an entry is the acceptance record for a domain
// migration, and the old core-domain copy must be gone.
const migratedRouteOwnership = {
  "apps/control-api": [
    "api/auth/status/route.ts",
    "api/auth/csrf/route.ts",
    "api/auth/login/route.ts",
    "api/auth/logout/route.ts",
    "api/auth/oidc/login/route.ts",
    "api/auth/oidc/callback/route.ts",
    "api/health/route.ts",
    "api/health/ping/route.ts",
    "api/health/degradation/route.ts",
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
    "api/provider-nodes/route.ts",
    "api/provider-nodes/[id]/route.ts",
    "api/provider-models/route.ts",
    "api/provider-nodes/validate/route.ts",
    "api/providers/validate/route.ts",
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
    "api/settings/proxy/test/route.ts",
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
    "api/v1/text-to-speech/[voiceId]/route.ts",
    "api/v1/audio/transcriptions/route.ts",
    "api/v1/audio/speech/route.ts",
    "api/v1/audio/translations/route.ts",
    "api/v1/images/edits/route.ts",
    "api/v1/images/generations/route.ts",
    "api/v1/images/upscale/route.ts",
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
    "legacy runtime package names are retired",
  ],
  violations,
};
console.log(JSON.stringify(report, null, 2));
if (strict && report.status !== "PASS") process.exitCode = 1;
