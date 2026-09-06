#!/usr/bin/env node

/**
 * Check the package boundary of the legacy open-sse implementation.
 *
 * This check is intentionally strict: open-sse is allowed to depend on
 * published workspace packages, but it must not reach into core-domain's
 * source tree and every external runtime package it imports must be declared
 * in its own package.json. Existing legacy violations are reported rather than
 * hidden behind a relaxed TypeScript configuration.
 */
import { builtinModules } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageDir = join(root, "packages", "open-sse");
const coreDomainDir = join(root, "packages", "core-domain");
const strict = process.argv.includes("--strict");
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const sourceExtensions = /\.(?:[cm]?[jt]sx?|mjs|cjs)$/i;
const violations = [];
const files = [];

const rel = (file) => relative(root, file).split(sep).join("/");
const add = (rule, file, detail) => violations.push({ rule, file: rel(file), detail });

function walk(dir) {
  if (!existsSync(dir)) return;
  const info = statSync(dir);
  if (info.isFile()) {
    if (sourceExtensions.test(dir)) files.push(dir);
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!ignored.has(entry.name)) walk(join(dir, entry.name));
  }
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

const manifestPath = join(packageDir, "package.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  add("package-manifest", manifestPath, "packages/open-sse/package.json is required");
}

if (manifest) {
  if (manifest.private !== true) add("package-private", manifestPath, "open-sse is an internal implementation package and must remain private");
  if (!manifest.exports || !manifest.exports["."]) add("package-exports", manifestPath, "an explicit package entrypoint is required");
  for (const retired of [
    "./config/embeddingRegistryRuntime",
    "./services/accountFallbackRuntime",
    "./services/rateLimitManagerRuntime",
  ]) {
    if (manifest.exports?.[retired]) {
      add("redundant-package-export", manifestPath, `${retired} must stay retired`);
    }
  }
  for (const [subpath, target] of Object.entries({
    "./config/embeddingRegistry": "./exports/config/embeddingRegistry.ts",
    "./services/accountFallback": "./exports/services/accountFallback.ts",
    "./services/rateLimitManager": "./exports/services/rateLimitManager.ts",
  })) {
    if (manifest.exports?.[subpath]?.import !== target) {
      add("broad-package-export", manifestPath, `${subpath} must target ${target}`);
    }
  }
}

walk(packageDir);
const declared = new Set([
  ...Object.keys(manifest?.dependencies ?? {}),
  ...Object.keys(manifest?.devDependencies ?? {}),
  ...Object.keys(manifest?.peerDependencies ?? {}),
  ...Object.keys(manifest?.optionalDependencies ?? {}),
]);
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const importPattern = /(?:from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\))/g;
const externalImports = new Map();
const coreDomainRefs = new Map();

for (const file of files) {
  // Remove comments before matching so prose such as `from "..."` cannot be
  // mistaken for a module edge. This is deliberately lexical and only feeds
  // the audit; it never rewrites source files.
  const source = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier) continue;
    const relativeTarget = specifier.startsWith(".") ? resolve(dirname(file), specifier) : null;
    const reachesCoreDomain = relativeTarget && (relativeTarget === coreDomainDir || relativeTarget.startsWith(`${coreDomainDir}${sep}`));
    if (reachesCoreDomain) {
      const current = coreDomainRefs.get(specifier) ?? { count: 0, files: new Set() };
      current.count += 1;
      current.files.add(rel(file));
      coreDomainRefs.set(specifier, current);
      continue;
    }
    if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#") || specifier === "open-sse" || specifier.startsWith("open-sse/") || specifier === "@shiguang-gateway/open-sse" || specifier.startsWith("@shiguang-gateway/open-sse/")) continue;
    const name = packageName(specifier);
    if (builtins.has(name)) continue;
    // A comment or prose string can contain an import-like phrase. Package
    // names are never whitespace-containing, so ignore those false positives.
    if (/\s/.test(name) || !/^(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+$/.test(name)) continue;
    const current = externalImports.get(name) ?? { count: 0, files: new Set() };
    current.count += 1;
    current.files.add(rel(file));
    externalImports.set(name, current);
  }
}

for (const [specifier, info] of coreDomainRefs) {
  add("core-domain-source-import", packageDir, `${specifier} (${info.count} import${info.count === 1 ? "" : "s"}) in ${[...info.files].slice(0, 3).join(", ")}; depend on a published contract instead of core-domain source`);
}
for (const [name, info] of externalImports) {
  if (!declared.has(name)) add("undeclared-runtime-dependency", packageDir, `${name} (${info.count} import${info.count === 1 ? "" : "s"}) in ${[...info.files].slice(0, 3).join(", ")}; declare it in packages/open-sse/package.json`);
}

const report = {
  status: violations.length ? "FAIL" : "PASS",
  package: "@shiguang-gateway/open-sse",
  filesScanned: files.length,
  coreDomainImportCount: [...coreDomainRefs.values()].reduce((sum, info) => sum + info.count, 0),
  undeclaredDependencyCount: [...externalImports.keys()].filter((name) => !declared.has(name)).length,
  violations,
};
console.log(JSON.stringify(report, null, 2));
if (strict && violations.length) process.exitCode = 1;
