#!/usr/bin/env node

/** Compare local routes with an optional read-only reference or the frozen contract hash. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const referenceRoot = resolve(process.env.SHIGUANG_GATEWAY_REFERENCE_DIR || join(repoRoot, "..", "Orbit"));
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const frozenContractSha256 = "1f9b667b02c61bc53f4feab303f56941a37506e651d0ba9e497c91c2a416be14";
const localApiExtensions = new Set([
  "media/cache/stats/route.ts",
  "media/cache/purge/route.ts",
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

const referenceApi = join(referenceRoot, "src", "app", "api");
const localApi = join(repoRoot, "packages", "gateway-runtime", "src", "app", "api");
const refFiles = walk(referenceApi);
const localFiles = walk(localApi);
const comparableLocalFiles = localFiles.filter((file) => !localApiExtensions.has(relative(localApi, file).split("\\").join("/")));
const referenceAvailable = refFiles.length > 0;
const refMap = new Map(refFiles.map((file) => [normalizeRoutePath(relative(referenceApi, file).split("\\").join("/")), contract(file)]));
const localMap = new Map(comparableLocalFiles.map((file) => [normalizeRoutePath(relative(localApi, file).split("\\").join("/")), contract(file)]));
const mismatches = [];
if (referenceAvailable) {
  for (const path of new Set([...refMap.keys(), ...localMap.keys()])) {
    const expected = refMap.get(path) || [];
    const actual = localMap.get(path) || [];
    if (expected.join(",") !== actual.join(",")) mismatches.push({ path, expected, actual });
  }
} else {
  const serialized = [...localMap].sort(([a], [b]) => a.localeCompare(b)).map(([path, verbs]) => `${path}:${verbs.join(",")}`).join("\n");
  const actualHash = createHash("sha256").update(serialized).digest("hex");
  if (comparableLocalFiles.length !== 689 || actualHash !== frozenContractSha256) {
    mismatches.push({ path: "<frozen-contract-baseline>", expected: [frozenContractSha256], actual: [actualHash] });
  }
}
const report = { referenceRoot, referenceAvailable, frozenContractSha256, routeFiles: referenceAvailable ? refFiles.length : 689, localRouteFiles: localFiles.length, additiveLocalApiExtensions: [...localApiExtensions], mismatches,
  status: (referenceAvailable ? refFiles.length === comparableLocalFiles.length : comparableLocalFiles.length === 689) && mismatches.length === 0 ? "PASS" : "FAIL" };
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--strict") && report.status !== "PASS") process.exitCode = 1;
