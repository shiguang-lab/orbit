#!/usr/bin/env node

/**
 * Static independence/parity gate.
 *
 * A reference checkout is optional read-only input and is never imported by
 * the runtime. Without one, committed route hashes keep CI/release validation
 * self-contained. Set SHIGUANG_GATEWAY_REFERENCE_DIR only for an explicit source compare.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const orbitRoot = resolve(process.env.SHIGUANG_GATEWAY_REFERENCE_DIR || join(repoRoot, "..", "Orbit"));
const strict = process.argv.includes("--strict");
const frozenBaseline = {
  apiRouteFiles: 689,
  apiGroups: 102,
  rootRouteFiles: 9,
  apiPathSha256: "95cc81aee27643d97699c826e8d4c95f04f01278301acf7913580e59965c7ed3",
  // Canonical public paths, excluding the separately tracked root A2A route.
  rootPathSha256: "783073f71ca49460508e60cbc58a028fee399dec5060d924d9dace0849b74543",
};
// Local capabilities that are intentionally additive to the frozen Orbit
// route tree. They have no upstream counterpart and are validated separately
// by the endpoint smoke tests.
const localApiExtensions = new Set([
  "media/cache/stats/route.ts",
  "media/cache/purge/route.ts",
  "a2a/route.ts",
  "docs/api/search/route.ts",
  ".well-known/agent.json/route.ts",
  ".well-known/agent-card.json/route.ts",
]);
// Root A2A transport is intentionally implemented by the edge Nest app; the
// legacy Next root route is removed as part of that physical migration.
const localRootRouteExtensions = new Set(["a2a/route.ts"]);
const normalizeRoutePath = (value) => value.replace(new RegExp("omni" + "route", "gi"), "gateway");

function walk(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
}

function text(path) {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

const officialRoutes = walk(join(orbitRoot, "src", "app", "api"), (p) => p.endsWith("route.ts"));
const referenceAvailable = officialRoutes.length > 0;
const officialGroups = new Set(officialRoutes.map((p) => relative(join(orbitRoot, "src", "app", "api"), p).split("/")[0]));
const officialRoutePaths = new Set(officialRoutes.map((p) => normalizeRoutePath(relative(join(orbitRoot, "src", "app", "api"), p).split("\\").join("/"))));
// Runtime route roots belong to deployable apps. The HTTP kernel only exposes
// transport primitives; its source tree must never be counted as a route
// catalog or parity source.
const appRouteRoots = ["edge-gateway", "control-api", "realtime"].
  map((name) => join(repoRoot, "apps", name, "src", "routes"))
  .filter(existsSync);
const appRouteFiles = appRouteRoots.flatMap((root) => walk(root, (p) => p.endsWith(".ts") && !p.endsWith("index.ts")));
const appHandlers = appRouteFiles.reduce((sum, p) => sum + (text(p).match(/app\.(?:get|post|put|patch|delete|options|head)\(/g) || []).length, 0);
const localRuntimeRoutesDir = join(repoRoot, "packages", "core-domain", "src", "app", "api");
// Route handlers migrate one domain at a time. Compare normalized API paths
// across both the remaining domain tree and handlers already owned by apps.
const localRouteSources = [
  { root: localRuntimeRoutesDir, pathRoot: localRuntimeRoutesDir },
  { root: join(repoRoot, "apps", "control-api", "src", "routes", "api"), pathRoot: join(repoRoot, "apps", "control-api", "src", "routes", "api") },
  { root: join(repoRoot, "apps", "edge-gateway", "src", "routes", "api"), pathRoot: join(repoRoot, "apps", "edge-gateway", "src", "routes", "api") },
].filter(({ root }) => existsSync(root));
const localRuntimeRoutes = localRouteSources.flatMap(({ root }) => walk(root, (p) => p.endsWith("route.ts")));
const officialRootDir = join(orbitRoot, "src", "app");
const localRootDir = join(repoRoot, "packages", "core-domain", "src", "app");
const officialRootRoutes = walk(officialRootDir, (p) => p.endsWith("route.ts") && !p.startsWith(`${join(officialRootDir, "api")}/`));
const localRootRoutes = walk(localRootDir, (p) => p.endsWith("route.ts") && !p.startsWith(`${join(localRootDir, "api")}/`));
// Route groups are a Next filesystem detail and do not exist in the HTTP URL
// exposed by a Nest controller. Compare both sides as public route paths.
const canonicalRootPath = (path) => path.replace(/(^|\/)\([^/]+\)\//g, "$1");
const rootRoutePaths = (dir, files) => new Set(files.map((p) => canonicalRootPath(relative(dir, p).split("\\").join("/"))));
const officialRootPaths = rootRoutePaths(officialRootDir, officialRootRoutes);
const localRootPaths = rootRoutePaths(localRootDir, localRootRoutes);
const hashPaths = (paths) => createHash("sha256").update([...paths].sort().join("\n")).digest("hex");
const isRootRoutePath = (path) =>
  /^(?:authorize|healthz|livez|readyz|a2a)\/route\.ts$/.test(path) ||
  /^\.well-known\/[^/]+\/route\.ts$/.test(path) ||
  path === "docs/api/search/route.ts" ||
  path.startsWith("dashboard/");
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
        // Keep the historical Next catch-all names in the parity key. Nest's
        // wildcard parameter itself is unnamed, so the surrounding route is
        // the only reliable discriminator.
        fullPath = fullPath.replace(/\/\*$/, fullPath.startsWith("dashboard/providers/services/")
          ? "/[[...path]]"
          : fullPath.includes("/vscode/combos/")
          ? "/[[...slug]]"
          : (fullPath.startsWith("v1beta/models/") || fullPath.startsWith("v1/responses/") || fullPath.startsWith("cursor-cli/")
              ? "/[...path]"
              : (fullPath.startsWith("vnc-session/") ? "/[...params]" : "/[...model]")));
        fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, "[$1]");
        const routePath = `${fullPath ? fullPath + "/" : ""}route.ts`;
        routes.add(routePath);
      }
    }
  }
  return routes;
}

const controllerFiles = ["control-api", "edge-gateway"].flatMap((name) =>
  walk(join(repoRoot, "apps", name, "src"), (p) => p.endsWith(".controller.ts"))
);
const controllerRoutePaths = controllerFiles.flatMap((f) => [...extractControllerRoutes(f)]);

const allControllerRoutePaths = new Set(controllerRoutePaths.map(normalizeRoutePath));
const controllerRootRoutePaths = new Set([...allControllerRoutePaths].filter(isRootRoutePath));
const comparableLocalRootPaths = new Set(
  [...localRootPaths, ...controllerRootRoutePaths].filter((path) => !localRootRouteExtensions.has(path)),
);
const comparableOfficialRootPaths = new Set([...officialRootPaths].filter((path) => !localRootRouteExtensions.has(path)));
const rootRouteMismatches = referenceAvailable ? [
  ...[...comparableOfficialRootPaths].filter((p) => !comparableLocalRootPaths.has(p)).map((path) => ({ path, side: "missing-local" })),
  ...[...comparableLocalRootPaths].filter((p) => !comparableOfficialRootPaths.has(p)).map((path) => ({ path, side: "extra-local" })),
].sort((a, b) => a.path.localeCompare(b.path)) :
  (comparableLocalRootPaths.size === frozenBaseline.rootRouteFiles - localRootRouteExtensions.size && hashPaths(comparableLocalRootPaths) === frozenBaseline.rootPathSha256
    ? []
    : [{ path: "<frozen-root-route-baseline>", side: "hash-mismatch" }]);
const retiredCompatDispatcherFiles = [
  join(repoRoot, "packages", "web-route-compat"),
  join(repoRoot, "packages", "web-handler-adapter", "src", "compat-dispatcher.ts"),
  join(repoRoot, "apps", "edge-gateway", "src", "routes", "compat", "dispatcher.ts"),
  join(repoRoot, "apps", "control-api", "src", "routes", "compat", "dispatcher.ts"),
];
const dynamicCompatDispatcherRemoved = retiredCompatDispatcherFiles.every((path) => !existsSync(path));
const nativeFallbackContracts = dynamicCompatDispatcherRemoved
  ? ["[...gatewayApiCatchAll]/route.ts", "v1/[...gatewayCatchAll]/route.ts"]
  : [];
const localRoutePaths = new Set([
  ...localRouteSources.flatMap(({ root, pathRoot }) =>
    walk(root, (p) => p.endsWith("route.ts")).map((p) => normalizeRoutePath(relative(pathRoot, p).split("\\").join("/")))
  ),
  // Root web routes are audited independently and must not inflate the API
  // route count. Explicit additive API routes remain allowed below.
  ...[...allControllerRoutePaths].filter((path) => !isRootRoutePath(path)),
  ...nativeFallbackContracts,
]);
const comparableLocalRoutePaths = new Set([...localRoutePaths].filter((path) => !localApiExtensions.has(path)));
const routePathMismatches = referenceAvailable ? [
  ...[...officialRoutePaths].filter((p) => !comparableLocalRoutePaths.has(p)).map((path) => ({ path, side: "missing-local" })),
  ...[...comparableLocalRoutePaths].filter((p) => !officialRoutePaths.has(p)).map((path) => ({ path, side: "extra-local" })),
].sort((a, b) => a.path.localeCompare(b.path)) :
  (comparableLocalRoutePaths.size === frozenBaseline.apiRouteFiles && hashPaths(comparableLocalRoutePaths) === frozenBaseline.apiPathSha256 ? [] : [{ path: "<frozen-api-route-baseline>", side: "hash-mismatch" }]);
const requiredApps = ["admin", "edge-gateway", "control-api", "realtime", "worker", "importer"];
const missingApps = requiredApps.filter((name) => !existsSync(join(repoRoot, "apps", name, "package.json")));

const allSourceFiles = [
  ...walk(join(repoRoot, "apps"), (p) => /\.(?:ts|tsx|js|mjs|json)$/.test(p)),
  ...walk(join(repoRoot, "packages"), (p) => /\.(?:ts|tsx|js|mjs|json)$/.test(p)),
  ...walk(join(repoRoot, "scripts"), (p) => /\.(?:ts|tsx|js|mjs|json)$/.test(p)),
].filter((p) => !p.split(sep).includes("dist"));
const forbidden = [
  { name: "runtime sibling Orbit import", re: /(?:from|import\s*\()\s*["'](?:\.\.\/[^"']*Orbit|\.\.\/\.\.\/\.\.\/Orbit)/, allow: /scripts[\\/]audit-gateway-independence\.mjs$/ },
  { name: "NAS proxy/runtime target", re: /SHIGUANG_GATEWAY_NAS_API_TARGET|SHIGUANG_GATEWAY_NAS_PROXY_ENABLED|proxyToNas|nasProxy/i },
  { name: "official Orbit host", re: /model\.publib\.cn|100\.87\.115\.78/i },
  { name: "official Orbit repository/runtime feed", re: /diegosouzapw[\\/]ShiguangGateway|api\.shiguangGateway\.com/i },
  { name: "legacy Orbit runtime package", re: /@shiguangGateway[\\/]orbit-runtime|packages[\\/]orbit-runtime/i },
  { name: "legacy Orbit listener port", re: /\b20128\b/ },
];
const violations = [];
for (const path of allSourceFiles) {
  const rel = relative(repoRoot, path);
  if (rel === "scripts/audit-gateway-independence.mjs") continue;
  for (const rule of forbidden) {
    if (rule.name === "runtime sibling Orbit import" && !rel.startsWith("apps/")) continue;
    if (rule.allow?.test(rel)) continue;
    if (rule.re.test(text(path))) violations.push({ file: rel, rule: rule.name });
  }
}

// A local `@/*` alias is valid only when the BFF tsconfig resolves it inside
// this repository. Keep the check explicit so a future sibling-path shim
// cannot be reintroduced under the same alias name.
for (const tsconfig of walk(join(repoRoot, "apps"), (p) => p.endsWith("tsconfig.json"))) {
  if (/\.\.\/\.\.\/\.\.\/Orbit|\.\.\/[^\"']*Orbit/.test(text(tsconfig))) {
    violations.push({ file: relative(repoRoot, tsconfig), rule: "runtime sibling Orbit import" });
  }
}

const mockFallbacks = [];
const knownFakeDashboardMarkers = [
  /pid:\s*48210/,
  /totalCalls24h:\s*342/,
  /avgDurationMs:\s*145/,
  /latencyMs\s*\|\|\s*142/,
  /tasks\?\.total\s*\?\?\s*86/,
  /Orbit Coordinator/,
  /pagesCount\?\.[^;\n]*\|\|\s*128/,
  // Never turn a credential/storage failure into a fabricated runtime value.
  /catch\(\(\)\s*=>\s*["']placeholder["']\)/,
];
for (const path of allSourceFiles) {
  if (relative(repoRoot, path) === "scripts/audit-gateway-independence.mjs") continue;
  const source = text(path);
  if (/mock fallback|mock entries|fixed baseline|fallbackDashboard/i.test(source) ||
      knownFakeDashboardMarkers.some((marker) => marker.test(source))) {
    mockFallbacks.push(relative(repoRoot, path));
  }
}

const localGroups = new Set([...comparableLocalRoutePaths].map((path) => path.split("/")[0]));
const missingGroups = referenceAvailable
  ? [...officialGroups].filter((group) => !localGroups.has(normalizeRoutePath(group))).sort()
  : (localGroups.size === frozenBaseline.apiGroups ? [] : ["<frozen-api-group-baseline>"]);

const report = {
  reference: orbitRoot,
  referenceAvailable,
  frozenBaseline,
  official: referenceAvailable ? { routeFiles: officialRoutes.length, apiGroups: officialGroups.size, rootRouteFiles: officialRootRoutes.length } : null,
    target: { appRouteFiles: appRouteFiles.length, appFastifyHandlers: appHandlers, controllerFiles: controllerFiles.length, controllerRoutePaths: allControllerRoutePaths.size, localApiRoutePaths: comparableLocalRoutePaths.size, localRuntimeRouteFiles: localRuntimeRoutes.length, localRootRoutePaths: comparableLocalRootPaths.size, localRootRouteFiles: localRootRoutes.length, additiveLocalApiExtensions: [...localApiExtensions], additiveLocalRootRouteExtensions: [...localRootRouteExtensions], dynamicCompatDispatcherRemoved },
  routePathMismatches,
  rootRouteMismatches,
  missingApiGroups: missingGroups,
  forbiddenReferenceCount: violations.length,
  forbiddenReferences: violations,
  mockFallbackFiles: mockFallbacks,
  requiredApps,
  missingApps,
  status: dynamicCompatDispatcherRemoved && missingGroups.length === 0 && routePathMismatches.length === 0 && rootRouteMismatches.length === 0 && violations.length === 0 && mockFallbacks.length === 0 && missingApps.length === 0 ? "PASS" : "FAIL",
};

console.log(JSON.stringify(report, null, 2));
if (strict && report.status !== "PASS") process.exitCode = 1;
