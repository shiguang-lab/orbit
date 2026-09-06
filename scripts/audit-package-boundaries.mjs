#!/usr/bin/env node

/**
 * Enforce the package ownership rule: packages contain capabilities shared by
 * multiple workspace units; app-specific routes and orchestration live below
 * apps/<name>. Legacy mixed packages are reported until decomposed.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const violations = [];
const rel = (file) => relative(repoRoot, file).split(sep).join("/");
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const add = (rule, file, detail) => violations.push({ rule, file: rel(file), detail });

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const info = statSync(dir);
  if (info.isFile()) {
    if (sourceExtensions.test(dir)) out.push(dir);
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!ignored.has(entry.name)) walk(join(dir, entry.name), out);
  }
  return out;
}

const appEntries = readdirSync(join(repoRoot, "apps"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(repoRoot, "apps", entry.name, "package.json")))
  .map((entry) => ({ dir: join(repoRoot, "apps", entry.name), manifest: readJson(join(repoRoot, "apps", entry.name, "package.json")) }));
const packageEntries = readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(repoRoot, "packages", entry.name, "package.json")))
  .map((entry) => ({ dir: join(repoRoot, "packages", entry.name), manifest: readJson(join(repoRoot, "packages", entry.name, "package.json")) }));
const allEntries = [...appEntries, ...packageEntries];
const packageNames = new Set(packageEntries.map((entry) => entry.manifest?.name).filter(Boolean));
const dependents = new Map([...packageNames].map((name) => [name, []]));

for (const entry of allEntries) {
  const deps = { ...(entry.manifest?.dependencies ?? {}), ...(entry.manifest?.optionalDependencies ?? {}) };
  for (const dep of Object.keys(deps)) {
    if (packageNames.has(dep)) dependents.get(dep).push(entry.manifest.name);
  }
}

function workspaceConsumers(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const direct = dependents.get(name) ?? [];
  const result = new Set(direct);
  for (const consumer of direct) {
    if (packageNames.has(consumer)) {
      for (const transitive of workspaceConsumers(consumer, seen)) result.add(transitive);
    }
  }
  return [...result];
}

/**
 * Resolve the applications that ultimately consume a package. Package-to-package
 * edges alone do not make a package shared: the rule is about the deployable
 * app boundaries that actually use the capability. A package may still be
 * consumed through a public contract package, so follow the dependency graph
 * and collect only app entries at the leaves.
 */
function appConsumers(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const result = new Set();
  for (const consumer of dependents.get(name) ?? []) {
    if (appEntries.some((entry) => entry.manifest?.name === consumer)) {
      result.add(consumer);
      continue;
    }
    if (packageNames.has(consumer)) {
      for (const app of appConsumers(consumer, seen)) result.add(app);
    }
  }
  return [...result];
}

const legacyMixed = new Set([
  "@shiguang-gateway/core-domain",
  "@shiguang-gateway/open-sse",
]);

// Legacy packages are still consumed by applications, so do not let their
// transitional status hide the two boundary leaks that are cheapest to detect:
// app-owned source trees and catch-all package exports.  These are audit-only
// findings; removing an export or moving a route requires an import migration.
for (const entry of packageEntries) {
  const name = entry.manifest?.name;
  if (!legacyMixed.has(name)) continue;
  for (const file of walk(join(entry.dir, "src"))) {
    if (/\/src\/(app|control|routes)\//.test(rel(file))) {
      add("legacy-app-owned-code", file, `${name} exposes app-owned routes/orchestration from a transitional package; migrate this file into apps/*`);
    }
  }
  const exportsField = entry.manifest?.exports;
  if (exportsField && Object.prototype.hasOwnProperty.call(exportsField, "./*")) {
    add("legacy-wildcard-export", join(entry.dir, "package.json"), `${name} exposes every internal subpath through ./*; replace with an explicit reviewed surface as imports migrate`);
  }
}

for (const entry of packageEntries) {
  const name = entry.manifest?.name;
  const consumers = workspaceConsumers(name);
  const applications = appConsumers(name);
  if (legacyMixed.has(name)) {
    add("legacy-mixed-package", join(entry.dir, "package.json"), `${name} still mixes app-owned routes/orchestration; migrate it before completion`);
    continue;
  }
  if (applications.length < 2) {
    add("package-not-shared", join(entry.dir, "package.json"), `${name} has ${applications.length} app consumer(s); packages require at least two deployable app consumers`);
  }
  for (const file of walk(join(entry.dir, "src"))) {
    if (/\/src\/(app|control|routes)\//.test(rel(file))) {
      add("app-owned-code-in-shared-package", file, "move app-specific routes/handlers into the owning apps/* module");
    }
  }
}

const result = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  rule: "packages contain only capabilities shared by multiple workspace units; app-specific code belongs in apps",
  packages: packageEntries.map((entry) => ({
    name: entry.manifest?.name,
    consumers: workspaceConsumers(entry.manifest?.name),
    appConsumers: appConsumers(entry.manifest?.name),
    classification: legacyMixed.has(entry.manifest?.name) ? "legacy-mixed" : "shared",
  })),
  violations,
};
console.log(JSON.stringify(result, null, 2));
if (strict && violations.length > 0) process.exitCode = 1;
