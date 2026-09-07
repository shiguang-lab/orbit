#!/usr/bin/env node

/**
 * Compare SQLite table declarations (CREATE/ALTER TABLE) with the canonical
 * packages/db-schema entity catalog.  This is an inventory check only: SQL
 * migrations remain owned by the domain app and are not rewritten here.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ignored = new Set([
  "node_modules",
  ".turbo",
  ".git",
  "dist",
  "build",
  "test",
  "tests",
  "__tests__",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sql"]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) out.push(path);
  }
  return out;
}

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, "$1")
    .replace(/(^|\n)\s*--.*(?=\n|$)/g, "$1");
}

function normalizeName(name) {
  return name.replace(/^[`"[]|[`"\]]$/g, "").toLowerCase();
}

const declarationPattern = /\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE)\s+([`"[]?[A-Za-z_][A-Za-z0-9_$-]*[`"\]]?)/gi;
const alterColumnPattern = /\bALTER\s+TABLE\s+([`"[]?[A-Za-z_][A-Za-z0-9_$-]*[`"\]]?)\s+ADD\s+(?:COLUMN\s+)?([`"[]?[A-Za-z_][A-Za-z0-9_$-]*[`"\]]?)/gi;
const sqlEvidencePattern = /\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|INSERT\s+INTO|UPDATE\s+[`"[]?[A-Za-z_]|DELETE\s+FROM|SELECT[\s\S]{0,160}?\bFROM)\b/i;
// Tables that are intentionally private to one deployable app.  They are
// reported for inventory purposes, but must not be promoted into the shared
// db-schema catalog: doing so would make an app-only table a package API.
const appPrivateTables = new Set([
  "cloud_agent_credentials",
  "cloud_agent_tasks",
  "agent_bridge_state",
  "agent_bridge_mappings",
  "agent_bridge_bypass",
]);
// SQL-looking examples in evaluation seed corpora are not production schema
// declarations. Keep these explicitly classified so a fixture token cannot
// create an unexplained package-only table in the coverage report.
const fixtureOnlyTables = new Map([
  ["users", "evaluation seed SQL example; no runtime users table exists"],
]);
const sqlNoise = new Set([
  "add", "alter", "and", "as", "by", "column", "create", "delete", "drop", "fail", "from", "if",
  "in", "insert", "into", "not", "on", "or", "re-run", "select", "table", "update", "where",
]);
const files = [...walk(join(repoRoot, "apps")), ...walk(join(repoRoot, "packages"))];
const declarations = new Map();
const alterColumns = new Map();
for (const file of files) {
  const source = stripSqlComments(readFileSync(file, "utf8"));
  for (const match of source.matchAll(declarationPattern)) {
    const table = normalizeName(match[1]);
    if (table.includes("$") || sqlNoise.has(table)) continue;
    const list = declarations.get(table) ?? [];
    if (list.length < 8) list.push(relative(repoRoot, file));
    declarations.set(table, list);
  }
  for (const match of source.matchAll(alterColumnPattern)) {
    const table = normalizeName(match[1]);
    const column = normalizeName(match[2]);
    if (sqlNoise.has(table) || sqlNoise.has(column)) continue;
    const list = alterColumns.get(table) ?? new Map();
    const filesForColumn = list.get(column) ?? [];
    if (filesForColumn.length < 4) filesForColumn.push(relative(repoRoot, file));
    list.set(column, filesForColumn);
    alterColumns.set(table, list);
  }
}

const outputDir = mkdtempSync(join(os.tmpdir(), "shiguang-db-schema-coverage-"));
try {
  const compile = spawnSync(
    "pnpm",
    ["--filter", "@shiguang-gateway/db-schema", "exec", "tsc", "--outDir", outputDir, "--declaration", "false", "--declarationMap", "false", "--sourceMap", "false"],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (compile.status !== 0) process.exit(compile.status ?? 1);
  const schema = await import(new URL(`file://${join(outputDir, "index.js")}`).href);
  schema.assertGatewayEntities();
  const canonical = new Set(Object.values(schema.GATEWAY_TABLES).map(normalizeName));
  const uncovered = [...declarations.keys()].filter((table) => !canonical.has(table)).sort();
  const columnDrift = {};
  for (const [table, columns] of alterColumns) {
    const entity = Object.values(schema.GATEWAY_ENTITIES).find((item) => normalizeName(item.tableName) === table);
    if (!entity) continue;
    const known = new Set(entity.columns.map((item) => normalizeName(item.name)));
    const missing = [...columns.keys()].filter((column) => !known.has(column)).sort();
    if (missing.length) columnDrift[table] = Object.fromEntries(missing.map((column) => [column, columns.get(column)]));
  }
  // Browser-only code cannot prove database ownership.  Restrict evidence to
  // server apps and SQL-looking lines so UI strings such as "users" do not
  // turn into false positives.
  const appFiles = walk(join(repoRoot, "apps"))
    .filter((file) => !file.includes(`${join("apps", "admin")}${join("", "")}`));
  const directAppEvidence = new Map();
  for (const table of uncovered) {
    const token = new RegExp(`\\b${table.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i");
    const evidence = appFiles
      .filter((file) => readFileSync(file, "utf8").split(/\r?\n/).some((line) => token.test(line) && sqlEvidencePattern.test(line)))
      .map((file) => relative(repoRoot, file));
    if (evidence.length) directAppEvidence.set(table, evidence.slice(0, 8));
  }
  if (Object.keys(columnDrift).length) {
    console.log(`entity ALTER COLUMN drift: ${Object.keys(columnDrift).length} table(s)`);
    for (const [table, columns] of Object.entries(columnDrift)) {
      for (const [column, evidence] of Object.entries(columns)) console.log(`  ${table}.${column} (${evidence.join(", ")})`);
    }
  } else {
    console.log("entity ALTER COLUMN drift: none");
  }

  console.log(`db-schema coverage: canonical=${canonical.size}, declared=${declarations.size}, uncovered=${uncovered.length}`);
  for (const table of uncovered) {
    const scope = appPrivateTables.has(table)
      ? "app-private"
      : fixtureOnlyTables.has(table)
        ? "fixture-only"
      : directAppEvidence.has(table)
        ? "app-evidence"
        : "package-only";
    console.log(`  ${table} [${scope}]`);
    if (fixtureOnlyTables.has(table)) console.log(`    reason: ${fixtureOnlyTables.get(table)}`);
    for (const file of declarations.get(table) ?? []) console.log(`    - ${file}`);
    for (const file of directAppEvidence.get(table) ?? []) console.log(`    app: ${file}`);
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      canonical: [...canonical].sort(),
      declared: Object.fromEntries([...declarations.entries()].sort()),
      uncovered,
      directAppEvidence: Object.fromEntries(directAppEvidence),
      columnDrift,
    }, null, 2));
  }
  // Strict mode fails when an uncovered table is referenced by app code unless
  // it is explicitly classified as app-private above. App-private DDL must
  // also live with its owning app; keeping it in a package would leak an
  // app-only schema into every deployable unit.
  const unclassifiedAppEvidence = [...directAppEvidence.keys()].filter((table) => !appPrivateTables.has(table) && !fixtureOnlyTables.has(table));
  const appPrivatePackageDeclarations = [...appPrivateTables].filter((table) =>
    (declarations.get(table) ?? []).some((file) => file.startsWith("packages/")),
  );
  if (appPrivatePackageDeclarations.length) {
    console.log(`app-private tables declared in packages: ${appPrivatePackageDeclarations.join(", ")}`);
  }
  if (process.argv.includes("--strict") && (unclassifiedAppEvidence.length || Object.keys(columnDrift).length || appPrivatePackageDeclarations.length)) process.exitCode = 1;
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
