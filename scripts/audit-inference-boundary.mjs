#!/usr/bin/env node

/**
 * Check the package boundary of the legacy inference implementation.
 *
 * This check is intentionally strict: inference is allowed to depend on
 * published workspace packages, but it must not reach into core's
 * source tree and every external runtime package it imports must be declared
 * in its own package.json. Existing legacy violations are reported rather than
 * hidden behind a relaxed TypeScript configuration.
 */
import { builtinModules } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageDir = join(root, "packages", "inference");
const coreDomainDir = join(root, "packages", "core");
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

const sourceRoot = join(packageDir, "src");
if (!existsSync(sourceRoot)) add("source-layout", sourceRoot, "implementation must live under src");
for (const entry of readdirSync(packageDir, { withFileTypes: true })) {
  if (entry.isDirectory() && !ignored.has(entry.name) && !["src", "test", "scripts"].includes(entry.name)) {
    add("source-layout", join(packageDir, entry.name), "implementation directories belong under src");
  }
}
const manifestPath = join(packageDir, "package.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  add("package-manifest", manifestPath, "packages/inference/package.json is required");
}

const buildConfigPath = join(packageDir, "tsconfig.build.json");
let buildConfig;
try {
  buildConfig = JSON.parse(readFileSync(buildConfigPath, "utf8"));
} catch {
  add("declaration-build", buildConfigPath, "a valid declaration build configuration is required");
}
if (buildConfig) {
  const options = buildConfig.compilerOptions ?? {};
  if (options.declaration !== true || options.emitDeclarationOnly !== true || options.noEmit !== false) {
    add("declaration-build", buildConfigPath, "build must emit declarations without JavaScript");
  }
  if (options.rootDir !== "src" || options.outDir !== "dist/types") {
    add("declaration-build", buildConfigPath, "declarations must preserve source paths under dist/types");
  }
  for (const forbidden of ["strict", "skipLibCheck", "noCheck"]) {
    if (Object.hasOwn(options, forbidden)) {
      add("declaration-build", buildConfigPath, `${forbidden} must not override the package typecheck policy`);
    }
  }
}

if (manifest) {
  if (manifest.private !== true) add("package-private", manifestPath, "inference is an internal implementation package and must remain private");
  if (!manifest.exports) add("package-exports", manifestPath, "explicit reviewed package subpaths are required");
  if (manifest.scripts?.build !== "node scripts/build-declarations.mjs") {
    add("declaration-build", manifestPath, "inference must build clean declarations through scripts/build-declarations.mjs");
  }
  if (typeof manifest.scripts?.typecheck !== "string") {
    add("package-typecheck", manifestPath, "inference must expose an explicit typecheck script");
  }

  const declarationTargetFor = (runtimeTarget) => {
    const sourceTarget = runtimeTarget.replace(/^\.\/src\//, "");
    const declarationTarget = sourceTarget
      .replace(/\.tsx?$/, ".d.ts")
      .replace(/\.mjs$/, ".d.mts")
      .replace(/\.cjs$/, ".d.cts")
      .replace(/\.jsx?$/, ".d.ts");
    return `./dist/types/${declarationTarget}`;
  };
  const declarationsBuilt = existsSync(join(packageDir, "dist", "types"));
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (!target || typeof target !== "object" || typeof target.import !== "string" || typeof target.types !== "string") {
      add("typed-package-export", manifestPath, `${subpath} must define explicit import and generated types targets`);
      continue;
    }
    const expectedTypes = declarationTargetFor(target.import);
    if (target.types !== expectedTypes) {
      add("typed-package-export", manifestPath, `${subpath} types must target ${expectedTypes}, received ${target.types}`);
    }
    const runtimeFile = join(packageDir, target.import.replace(/^\.\//, ""));
    if (!existsSync(runtimeFile)) {
      add("missing-runtime-export", manifestPath, `${subpath} runtime target does not exist: ${target.import}`);
    }
    if (declarationsBuilt) {
      const declarationFile = join(packageDir, target.types.replace(/^\.\//, ""));
      if (!existsSync(declarationFile)) {
        add("missing-declaration-export", manifestPath, `${subpath} declaration target was not built: ${target.types}`);
      }
    }
  }
  for (const retired of [
    ".",
    "./config/embeddingRegistryRuntime",
    "./services/accountFallbackRuntime",
    "./services/rateLimitManagerRuntime",
  ]) {
    if (manifest.exports?.[retired]) {
      add("redundant-package-export", manifestPath, `${retired} must stay retired`);
    }
  }
  for (const [subpath, target] of Object.entries({
    "./config/embeddingRegistry": "./src/exports/config/embeddingRegistry.ts",
    "./services/accountFallback": "./src/exports/services/accountFallback.ts",
    "./services/rateLimitManager": "./src/exports/services/rateLimitManager.ts",
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
    if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#") || specifier === "inference" || specifier.startsWith("inference/") || specifier === "@orbit/inference" || specifier.startsWith("@orbit/inference/")) continue;
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
  add("core-source-import", packageDir, `${specifier} (${info.count} import${info.count === 1 ? "" : "s"}) in ${[...info.files].slice(0, 3).join(", ")}; depend on a published contract instead of core source`);
}
for (const [name, info] of externalImports) {
  if (!declared.has(name)) add("undeclared-runtime-dependency", packageDir, `${name} (${info.count} import${info.count === 1 ? "" : "s"}) in ${[...info.files].slice(0, 3).join(", ")}; declare it in packages/inference/package.json`);
}

const report = {
  status: violations.length ? "FAIL" : "PASS",
  package: "@orbit/inference",
  filesScanned: files.length,
  coreDomainImportCount: [...coreDomainRefs.values()].reduce((sum, info) => sum + info.count, 0),
  undeclaredDependencyCount: [...externalImports.keys()].filter((name) => !declared.has(name)).length,
  violations,
};
console.log(JSON.stringify(report, null, 2));
if (strict && violations.length) process.exitCode = 1;
