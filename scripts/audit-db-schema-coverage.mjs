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
const ignored = new Set(["node_modules", ".turbo", ".git", "dist", "build"]);
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
const sqlEvidencePattern = /\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|INSERT\s+INTO|UPDATE|DELETE\s+FROM|SELECT[\s\S]{0,160}?\bFROM)\b/i;
const sqlNoise = new Set([
  "add", "alter", "and", "as", "by", "column", "create", "delete", "drop", "fail", "from", "if",
  "in", "insert", "into", "not", "on", "or", "re-run", "select", "table", "update", "where",
]);
const files = [...walk(join(repoRoot, "apps")), ...walk(join(repoRoot, "packages"))];
const declarations = new Map();
for (const file of files) {
  const source = stripSqlComments(readFileSync(file, "utf8"));
  for (const match of source.matchAll(declarationPattern)) {
    const table = normalizeName(match[1]);
    if (table.includes("$") || sqlNoise.has(table)) continue;
    const list = declarations.get(table) ?? [];
    if (list.length < 8) list.push(relative(repoRoot, file));
    declarations.set(table, list);
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

  console.log(`db-schema coverage: canonical=${canonical.size}, declared=${declarations.size}, uncovered=${uncovered.length}`);
  for (const table of uncovered) {
    const scope = directAppEvidence.has(table) ? "app-evidence" : "package-only";
    console.log(`  ${table} [${scope}]`);
    for (const file of declarations.get(table) ?? []) console.log(`    - ${file}`);
    for (const file of directAppEvidence.get(table) ?? []) console.log(`    app: ${file}`);
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      canonical: [...canonical].sort(),
      declared: Object.fromEntries([...declarations.entries()].sort()),
      uncovered,
      directAppEvidence: Object.fromEntries(directAppEvidence),
    }, null, 2));
  }
  // Strict mode only fails when an uncovered table is referenced by app code.
  // Package-local tables are intentionally left for the owning app migration.
  if (process.argv.includes("--strict") && directAppEvidence.size) process.exitCode = 1;
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
