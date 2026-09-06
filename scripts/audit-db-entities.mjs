#!/usr/bin/env node

/** Compile and execute the db-schema catalog's internal consistency guard. */
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDir = mkdtempSync(join(os.tmpdir(), "shiguang-db-schema-"));

const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const walk = (dir, out = []) => {
  try {
    const info = statSync(dir);
    if (info.isFile()) {
      if (sourceExtensions.test(dir)) out.push(dir);
      return out;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!ignored.has(entry.name)) walk(join(dir, entry.name), out);
    }
  } catch { /* source directories are optional for some workspace units */ }
  return out;
};

/**
 * Keep the physical entity declarations in the documented Nest-style
 * `src/entities/*.entity.ts` boundary.  The runtime is ORM-neutral, but the
 * source layout still matters: putting an entity next to a bootstrap helper
 * or an app implementation makes the catalog easy to bypass accidentally.
 */
function assertEntitySourceLayout() {
  const entitiesDir = join(repoRoot, "packages", "db-schema", "src", "entities");
  const entries = readdirSync(entitiesDir, { withFileTypes: true });
  const entityFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".entity.ts"))
    .map((entry) => entry.name)
    .sort();
  if (entityFiles.length === 0) {
    throw new Error("db-schema has no src/entities/*.entity.ts files");
  }

  const declarationsOutsideEntityFiles = [];
  for (const file of walk(join(repoRoot, "packages", "db-schema", "src"))) {
    const relativePath = relative(repoRoot, file).split(sep).join("/");
    const isEntityFile = relativePath.startsWith("packages/db-schema/src/entities/") &&
      relativePath.endsWith(".entity.ts");
    if (isEntityFile) continue;
    const source = readFileSync(file, "utf8");
    if (/export\s+const\s+\w+Entity\s*:\s*EntityDefinition\b/.test(source)) {
      declarationsOutsideEntityFiles.push(relativePath);
    }
  }
  if (declarationsOutsideEntityFiles.length) {
    throw new Error(
      `EntityDefinition declarations must live in src/entities/*.entity.ts: ${declarationsOutsideEntityFiles.join(", ")}`,
    );
  }

  const barrel = readFileSync(join(entitiesDir, "index.ts"), "utf8");
  const missingBarrelExports = entityFiles.filter((file) => {
    const stem = file.replace(/\.ts$/, "").replace(/\./g, "\\.");
    return !new RegExp(`export\\s+\\*\\s+from\\s+[\"']\\./${stem}\\.(?:js|ts)[\"']`).test(barrel);
  });
  if (missingBarrelExports.length) {
    throw new Error(`src/entities/index.ts does not export: ${missingBarrelExports.join(", ")}`);
  }
  console.log(`db-schema entity source layout: PASS (${entityFiles.length} files)`);
}

/**
 * Resolve deployable apps through workspace package dependencies. This is
 * deliberately separate from SQL evidence: a package can be consumed by
 * several apps while a particular table remains write-owned by one app.
 */
function workspaceAppConsumers(name, appEntries, packageEntries, dependents, seen = new Set()) {
  if (seen.has(name)) return [];
  const path = new Set(seen);
  path.add(name);
  const apps = new Set();
  for (const consumer of dependents.get(name) ?? []) {
    if (appEntries.some((entry) => entry.manifest?.name === consumer)) {
      apps.add(consumer);
    } else if (packageEntries.some((entry) => entry.manifest?.name === consumer)) {
      for (const app of workspaceAppConsumers(consumer, appEntries, packageEntries, dependents, path)) apps.add(app);
    }
  }
  return [...apps].sort();
}

function classifySqlLine(line, tableName) {
  // Require the SQL verb to be attached to the table token.  A prose line
  // such as "Files were updated" must not become write evidence merely
  // because it contains the words "files" and "update".
  const table = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const writePattern = new RegExp(
    `\\b(?:INSERT(?:\\s+OR\\s+(?:REPLACE|ROLLBACK|ABORT|FAIL|IGNORE))?\\s+INTO|REPLACE\\s+INTO|UPDATE(?:\\s+OR\\s+(?:ROLLBACK|ABORT|REPLACE|FAIL|IGNORE))?|DELETE\\s+FROM|CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?|ALTER\\s+TABLE|DROP\\s+TABLE)\\s+(?:["']|\\x60)?${table}\\b`,
    "i",
  );
  return writePattern.test(line) ? "write" : "read";
}

function collectUsage(entities, appEntries, packageEntries, appConsumers) {
  const usage = Object.fromEntries(Object.keys(entities).map((key) => [key, {
    directApps: {},
    packageSources: {},
  }]));
  const allSources = [
    ...appEntries.flatMap((entry) => walk(join(entry.dir, "src")).map((file) => ({ file, unit: entry.manifest?.name, kind: "app" }))),
    ...packageEntries
      .filter((entry) => entry.manifest?.name !== "@shiguang-gateway/db-schema")
      .flatMap((entry) => walk(join(entry.dir, "src")).map((file) => ({ file, unit: entry.manifest?.name, kind: "package" }))),
  ];
  for (const { file, unit, kind } of allSources) {
    const source = readFileSync(file, "utf8");
    for (const [key, entity] of Object.entries(entities)) {
      const token = new RegExp(`\\b${entity.tableName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i");
      const matches = source.split(/\r?\n/).filter((line) => token.test(line));
      if (matches.length === 0) continue;
      const reads = matches.filter((line) => classifySqlLine(line, entity.tableName) === "read").length;
      const writes = matches.length - reads;
      if (kind === "app") {
        usage[key].directApps[unit] ??= { reads: 0, writes: 0 };
        usage[key].directApps[unit].reads += reads;
        usage[key].directApps[unit].writes += writes;
      } else {
        usage[key].packageSources[unit] ??= { reads: 0, writes: 0, files: [], appConsumers: appConsumers(unit) };
        usage[key].packageSources[unit].reads += reads;
        usage[key].packageSources[unit].writes += writes;
        if (usage[key].packageSources[unit].files.length < 5) usage[key].packageSources[unit].files.push(relative(repoRoot, file).split(sep).join("/"));
      }
    }
  }
  return usage;
}

try {
  assertEntitySourceLayout();
  const compile = spawnSync(
    "pnpm",
    [
      "--filter",
      "@shiguang-gateway/db-schema",
      "exec",
      "tsc",
      "--outDir",
      outputDir,
      "--declaration",
      "false",
      "--declarationMap",
      "false",
      "--sourceMap",
      "false",
    ],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (compile.status !== 0) process.exit(compile.status ?? 1);

  const schema = await import(pathToFileURL(join(outputDir, "index.js")).href);
  const { assertGatewayEntities, GATEWAY_ENTITIES } = schema;
  assertGatewayEntities();
  console.log("db-schema entity catalog: PASS");

  const appEntries = readdirSync(join(repoRoot, "apps"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ dir: join(repoRoot, "apps", entry.name), manifest: readJson(join(repoRoot, "apps", entry.name, "package.json")) }))
    .filter((entry) => entry.manifest?.name);
  const packageEntries = readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ dir: join(repoRoot, "packages", entry.name), manifest: readJson(join(repoRoot, "packages", entry.name, "package.json")) }))
    .filter((entry) => entry.manifest?.name);
  const packageNames = new Set(packageEntries.map((entry) => entry.manifest.name));
  const dependents = new Map([...packageNames].map((name) => [name, []]));
  for (const entry of [...appEntries, ...packageEntries]) {
    const deps = { ...(entry.manifest.dependencies ?? {}), ...(entry.manifest.optionalDependencies ?? {}) };
    for (const dep of Object.keys(deps)) {
      if (packageNames.has(dep)) dependents.get(dep).push(entry.manifest.name);
    }
  }
  const consumers = (name) => workspaceAppConsumers(name, appEntries, packageEntries, dependents);
  const usage = collectUsage(GATEWAY_ENTITIES, appEntries, packageEntries, consumers);
  const sharedConsumers = consumers("@shiguang-gateway/db-schema");
  console.log(`db-schema sharedConsumers (${sharedConsumers.length}): ${sharedConsumers.join(", ") || "none"}`);

  const audit = {};
  for (const [key, entity] of Object.entries(GATEWAY_ENTITIES)) {
    const tableUsage = usage[key];
    const directWrites = Object.entries(tableUsage.directApps).filter(([, value]) => value.writes > 0).map(([app]) => app);
    const packageWrites = Object.entries(tableUsage.packageSources).filter(([, value]) => value.writes > 0).map(([pkg]) => pkg);
    const mismatches = directWrites.filter((app) => app !== `@shiguang-gateway/${entity.owner}`);
    const ownerConsistency = mismatches.length > 0
      ? "FAIL"
      : directWrites.length > 0
        ? "PASS-direct"
        : packageWrites.length > 0
          ? "PASS-indirect-declared-owner"
          : "UNOBSERVED";
    audit[key] = {
      table: entity.tableName,
      owner: entity.owner,
      ownerConsistency,
      sharedConsumers,
      directAppSql: tableUsage.directApps,
      packageSql: tableUsage.packageSources,
    };
    const evidence = [...directWrites, ...packageWrites];
    console.log(`  ${key} -> owner=${entity.owner}, ownerConsistency=${ownerConsistency}, sqlEvidence=${evidence.length ? evidence.join(", ") : "none"}`);
  }
  if (process.argv.includes("--json")) console.log(JSON.stringify({ sharedConsumers, entities: audit }, null, 2));
  if (Object.values(audit).some((entity) => entity.ownerConsistency === "FAIL")) process.exitCode = 1;
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
