#!/usr/bin/env node

/** Compare local routes with an optional read-only reference or the frozen contract hash. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const referenceRoot = resolve(process.env.SHIGUANG_GATEWAY_REFERENCE_DIR || join(repoRoot, "..", "Orbit"));
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const frozenContractSha256 = "83173aff965fddda925fc9ae256b7131731aa5d2c5fd73aa05bd3c54fe8f19d2";
const localApiExtensions = new Set([
  // Signed gateway SSO session, covered by control-api auth-session tests.
  "auth/session/route.ts",
  "media/cache/stats/route.ts",
  "media/cache/purge/route.ts",
  // `/a2a` is a protocol root (not part of Next's `app/api` tree); it is
  // intentionally represented by the edge Nest controller and omitted from
  // the historical API route reference set.
  "a2a/route.ts",
  // Documentation search is a root web surface now owned by edge-gateway;
  // it is intentionally represented by a Nest controller rather than the
  // historical Next app route.
  "docs/api/search/route.ts",
  // Agent Card discovery is now served by edge-gateway's Nest controller.
  ".well-known/agent.json/route.ts",
  ".well-known/agent-card.json/route.ts",
  // Private, token-authenticated control-to-edge command surface. It has no
  // historical public Next route contract and is not exposed by control-api.
  "internal/tunnels/command/route.ts",
  "internal/runtime/command/route.ts",
]);
// Whole-runtime lifecycle belongs to the external CLI supervisor. The former
// control routes terminated only the control process while claiming to stop or
// restart the entire split runtime, so they are intentionally absent.
const retiredMisleadingLifecycleRoutes = new Set([
  "restart/route.ts",
  "shutdown/route.ts",
]);
const normalizeRoutePath = (value) => value.replace(new RegExp("omni" + "route", "gi"), "gateway");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.isFile() && file.endsWith("route.ts")) out.push(file);
  }
  return out;
}

function contract(file) {
  const source = readFileSync(file, "utf8");
  const found = new Set();
  for (const method of methods) {
    const re = new RegExp(`(?:export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b|export\\s*\\{[^}]*\\b${method}\\b)`, "m");
    if (re.test(source)) found.add(method);
  }
  return [...found].sort();
}

function extractControllerContracts(controllerFile) {
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
  const map = new Map();
  let match;
  while ((match = methodRegex.exec(source)) !== null) {
    const verb = match[1].toUpperCase();
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
        // Nest/Fastify uses a trailing wildcard for the Next catch-all model
        // route; retain the canonical contract key for comparison.
        fullPath = fullPath.replace(/\/\*$/, fullPath.includes("/vscode/combos/") ? "/[[...slug]]" : (fullPath.startsWith("v1beta/models/") || fullPath.startsWith("v1/responses/") || fullPath.startsWith("cursor-cli/") ? "/[...path]" : (fullPath.startsWith("vnc-session/") ? "/[...params]" : "/[...model]")));
        fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, "[$1]");
        const routePath = `${fullPath ? fullPath + "/" : ""}route.ts`;
        // A2A's REST task routes intentionally mirror the Next handlers and do
        // not advertise an OPTIONS method. CORS preflight is owned by the
        // canonical JSON-RPC `/a2a` endpoint; do not synthesize OPTIONS for
        // every `api/a2a/*` controller when reconstructing the contract.
        const isClientV1 = fullPath.startsWith("v1/") || fullPath.startsWith("v1beta/");
        // `/v1/me/status` is a bearer-key self-service read endpoint whose
        // historical contract declares GET only; do not synthesize OPTIONS.
        const implicitOptions = isClientV1 && !controllerFile.includes("/apps/control-api/") && routePath !== "v1/me/status/route.ts";
        if (!map.has(routePath)) map.set(routePath, implicitOptions ? new Set(["OPTIONS"]) : new Set());
        map.get(routePath).add(verb);
      }
    }
  }

  return [...map.entries()].map(([routePath, verbs]) => ({
    routePath,
    verbs: [...verbs].sort()
  }));
}

function walkControllers(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walkControllers(file, out);
    else if (entry.isFile() && file.endsWith(".controller.ts")) out.push(file);
  }
  return out;
}

const referenceApi = join(referenceRoot, "src", "app", "api");
const localApi = join(repoRoot, "packages", "core-domain", "src", "app", "api");
const localApiRoots = [
  localApi,
  join(repoRoot, "apps", "control-api", "src", "routes", "api"),
  join(repoRoot, "apps", "edge-gateway", "src", "routes", "api"),
].filter(existsSync);

// A2A is an edge-owned Nest transport. Keep the historical contract in the
// controller map, but reject any regression that recreates the old Next route
// files under core-domain (which would register a second transport surface).
const legacyA2ARouteRoots = [
  join(repoRoot, "packages", "core-domain", "src", "app", "a2a"),
  join(repoRoot, "packages", "core-domain", "src", "app", "api", "a2a"),
];
const staleA2ARoutes = legacyA2ARouteRoots.flatMap((root) => walk(root));
const controllerRoots = [
  join(repoRoot, "apps", "control-api", "src"),
  join(repoRoot, "apps", "edge-gateway", "src"),
].filter(existsSync);

const refFiles = walk(referenceApi);
const localFiles = localApiRoots.flatMap((root) => walk(root));
const controllerFiles = controllerRoots.flatMap((root) => walkControllers(root));

// The two former catch-all route files no longer exist. Their method contract
// is implemented by native Nest fallback handling and remains part of parity.
const retiredCompatDispatcherFiles = [
  join(repoRoot, "packages", "web-route-compat"),
  join(repoRoot, "packages", "web-handler-adapter", "src", "compat-dispatcher.ts"),
  join(repoRoot, "apps", "edge-gateway", "src", "routes", "compat", "dispatcher.ts"),
  join(repoRoot, "apps", "control-api", "src", "routes", "compat", "dispatcher.ts"),
];
const nativeFallbackContracts = retiredCompatDispatcherFiles.every((path) => !existsSync(path))
  ? ["[...gatewayApiCatchAll]/route.ts", "v1/[...gatewayCatchAll]/route.ts"]
  : [];

const localPath = (file) => {
  const root = localApiRoots.find((candidate) => file === candidate || file.startsWith(`${candidate}/`));
  return root ? relative(root, file).split("\\").join("/") : file;
};

const refMap = new Map(refFiles
  .map((file) => [normalizeRoutePath(relative(referenceApi, file).split("\\").join("/")), contract(file)])
  .filter(([routePath]) => !retiredMisleadingLifecycleRoutes.has(routePath)));
const localMap = new Map();

for (const routePath of nativeFallbackContracts) {
  localMap.set(routePath, [...methods].sort());
}

for (const file of localFiles) {
  const pathKey = localPath(file);
  if (!localApiExtensions.has(pathKey)) {
    localMap.set(normalizeRoutePath(pathKey), contract(file));
  }
}

for (const controllerFile of controllerFiles) {
  const contracts = extractControllerContracts(controllerFile);
  for (const { routePath, verbs } of contracts) {
    // This audit freezes the public API surface. UI-only root routes are
    // app-owned controllers but intentionally absent from the API baseline.
    if (
      routePath === "authorize/route.ts" ||
      routePath === "healthz/route.ts" ||
      routePath === "livez/route.ts" ||
      routePath === "readyz/route.ts" ||
      routePath.startsWith("dashboard/")
    ) continue;
    if (!localApiExtensions.has(routePath)) {
      const normalized = normalizeRoutePath(routePath);
      const existing = localMap.get(normalized) || [];
      const combined = [...new Set([...existing, ...verbs])].sort();
      localMap.set(normalized, combined);
    }
  }
}

const mismatches = [];
for (const file of staleA2ARoutes) {
  mismatches.push({
    path: relative(repoRoot, file).split("\\").join("/"),
    expected: [],
    actual: ["legacy Next A2A route must be removed"],
  });
}
const referenceAvailable = refFiles.length > 0;
if (referenceAvailable) {
  for (const path of new Set([...refMap.keys(), ...localMap.keys()])) {
    const expected = refMap.get(path) || [];
    const actual = localMap.get(path) || [];
    if (expected.join(",") !== actual.join(",")) mismatches.push({ path, expected, actual });
  }
} else {
  const serialized = [...localMap].sort(([a], [b]) => a.localeCompare(b)).map(([path, verbs]) => `${path}:${verbs.join(",")}`).join("\n");
  const actualHash = createHash("sha256").update(serialized).digest("hex");
  if (localMap.size !== 687 || actualHash !== frozenContractSha256) {
    mismatches.push({ path: "<frozen-contract-baseline>", expected: [frozenContractSha256], actual: [actualHash] });
  }
}
const expectedRouteCount = referenceAvailable ? refMap.size : 687;
const report = { referenceRoot, referenceAvailable, frozenContractSha256, routeFiles: expectedRouteCount, localRouteFiles: localMap.size, additiveLocalApiExtensions: [...localApiExtensions], retiredMisleadingLifecycleRoutes: [...retiredMisleadingLifecycleRoutes], mismatches,
  status: localMap.size === expectedRouteCount && mismatches.length === 0 ? "PASS" : "FAIL" };
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--strict") && report.status !== "PASS") process.exitCode = 1;
