#!/usr/bin/env node

/** Verify a completed cold-snapshot import without contacting any service. */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const [sourceArg, targetArg] = process.argv.slice(2);
if (!sourceArg || !targetArg) {
  console.error("Usage: node scripts/verify-imported-data.mjs <source-data-dir> <target-data-dir>");
  process.exit(2);
}

const source = path.resolve(sourceArg);
const target = path.resolve(targetArg);
const hash = async (file) => {
  const data = await fs.readFile(file);
  return { bytes: data.byteLength, sha256: createHash("sha256").update(data).digest("hex") };
};
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);
const isIgnored = (relativePath) => /[^/]+-import-manifest\.json$/.test(relativePath) ||
  relativePath.split("/").some((part) => /^\..*-import-backup-/.test(part));
async function listFiles(root, current = root, output = []) {
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (isIgnored(relative)) continue;
    if (entry.isDirectory()) await listFiles(root, absolute, output);
    else if (entry.isFile()) output.push(relative);
    else if (entry.isSymbolicLink()) throw new Error(`symbolic links are not allowed: ${relative}`);
  }
  return output.sort();
}
const sourceDb = path.join(source, "storage.sqlite");
const targetDb = path.join(target, "storage.sqlite");
if (!(await exists(sourceDb)) || !(await exists(targetDb))) {
  console.error("Both source and target must contain storage.sqlite");
  process.exit(1);
}

const sourceDigest = await hash(sourceDb);
const targetDigest = await hash(targetDb);
const targetManifestPath = path.join(target, "gateway-import-manifest.json");
const manifest = JSON.parse(await fs.readFile(targetManifestPath, "utf8"));
const transformedPaths = new Set((manifest.transformedFiles ?? []).map((entry) => entry.path));
const sourceFiles = await listFiles(source);
const targetFiles = await listFiles(target);
const manifestFiles = Array.isArray(manifest.files) ? manifest.files.map((entry) => entry.path).sort() : [];
const mutablePatterns = Array.isArray(manifest.runtimeMutablePaths) ? manifest.runtimeMutablePaths : [];
const isRuntimeMutable = (relative) => mutablePatterns.some((pattern) =>
  pattern.endsWith("/**") ? relative.startsWith(pattern.slice(0, -2)) : relative === pattern,
);
const fileSet = [...new Set([...sourceFiles, ...targetFiles, ...manifestFiles])];
const fileMismatches = [];
for (const relative of fileSet) {
  const sourcePath = path.join(source, relative);
  const targetPath = path.join(target, relative);
  const sourceExists = await exists(sourcePath);
  const targetExists = await exists(targetPath);
  if (!sourceExists || !targetExists) {
    // SQLite may checkpoint or recreate WAL/SHM sidecars as soon as a
    // verifier opens a live copy. Their presence is intentionally covered by
    // runtimeMutablePaths, including the missing-vs-present case.
    if (isRuntimeMutable(relative)) continue;
    fileMismatches.push({ path: relative, source: sourceExists, target: targetExists });
    continue;
  }
  const [sourceFile, targetFile] = await Promise.all([hash(sourcePath), hash(targetPath)]);
  if (!isRuntimeMutable(relative) && !transformedPaths.has(relative) && (sourceFile.bytes !== targetFile.bytes || sourceFile.sha256 !== targetFile.sha256)) {
    fileMismatches.push({ path: relative, source: sourceFile, target: targetFile });
  }
}
const immutableSourceFiles = sourceFiles.filter((file) => !isRuntimeMutable(file));
const immutableManifestFiles = manifestFiles.filter((file) => !isRuntimeMutable(file));
const manifestMismatches = immutableManifestFiles.length !== immutableSourceFiles.length ||
  immutableManifestFiles.some((file, index) => file !== immutableSourceFiles[index]);
const db = new DatabaseSync(targetDb, { readOnly: true });
let integrity;
try {
  integrity = db.prepare("PRAGMA integrity_check").get()?.integrity_check;
} catch (error) {
  db.close();
  throw error;
}
const count = (table) => {
  const handle = new DatabaseSync(targetDb, { readOnly: true });
  try {
    const existsRow = handle.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    return existsRow ? handle.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n : null;
  } finally {
    handle.close();
  }
};
const dynamicTables = new Set(["job_runs", "quota_snapshots", "call_logs", "webhook_deliveries"]);
const runtimeMutableColumns = new Set([
  "last_used_at", "updated_at", "last_tested", "last_health_check_at", "last_ping_at",
  "last_pinged_reset_key", "backoff_level", "rate_limited_until", "test_status",
  "last_error", "last_error_at", "last_error_type", "last_error_source", "error_code",
]);
const overlayColumns = new Set();
for (const entry of manifest.providerConfigOverlay?.applied ?? []) {
  for (const field of entry.fields ?? []) {
    if (field === "defaultModel") overlayColumns.add("default_model");
    if (String(field).startsWith("providerSpecificData.")) overlayColumns.add("provider_specific_data");
  }
}
const tableNames = (handle) => handle
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name)
  .filter((name) => typeof name === "string");
const tableColumns = (handle, table) => new Set(
  handle.prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all().map((row) => row.name),
);
const stableValue = (value) => {
  if (value instanceof Uint8Array) return { type: "blob", value: Buffer.from(value).toString("base64") };
  return value;
};
const tableContentMismatches = [];
const sourceHandle = new DatabaseSync(sourceDb, { readOnly: true });
try {
  const targetHandle = db;
  const targetTables = new Set(tableNames(targetHandle));
  for (const table of tableNames(sourceHandle)) {
    if (dynamicTables.has(table) || !targetTables.has(table)) continue;
    const sourceCols = [...tableColumns(sourceHandle, table)];
    const targetCols = tableColumns(targetHandle, table);
    const columns = sourceCols.filter((column) => targetCols.has(column) && !runtimeMutableColumns.has(column) &&
      !(table === "provider_connections" && overlayColumns.has(column)));
    if (columns.length === 0) continue;
    const quoted = columns.map((column) => `"${column.replaceAll('"', '""')}"`).join(", ");
    const sourceRows = sourceHandle.prepare(`SELECT ${quoted} FROM "${table.replaceAll('"', '""')}"`).all()
      .filter((row) => !(table === "key_value" && ["provider_limits_auto_sync_last_run", "_settingsRevision"].includes(row.key)))
      .map((row) => columns.map((column) => stableValue(row[column])));
    const targetRows = targetHandle.prepare(`SELECT ${quoted} FROM "${table.replaceAll('"', '""')}"`).all()
      .filter((row) => !(table === "key_value" && ["provider_limits_auto_sync_last_run", "_settingsRevision"].includes(row.key)))
      .map((row) => columns.map((column) => stableValue(row[column])));
    const sourceSorted = sourceRows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const targetSorted = targetRows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const sourceRowHash = createHash("sha256").update(JSON.stringify(sourceSorted)).digest("hex");
    const targetRowHash = createHash("sha256").update(JSON.stringify(targetSorted)).digest("hex");
    const countRows = (rows) => {
      const counts = new Map();
      for (const row of rows) {
        const key = JSON.stringify(row);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    };
    const targetCounts = countRows(targetSorted);
    const sourceCounts = countRows(sourceSorted);
    const sourceNotContained = [...sourceCounts].some(([row, n]) => (targetCounts.get(row) ?? 0) < n);
    if (sourceNotContained) {
      tableContentMismatches.push({ table, sourceRows: sourceRows.length, targetRows: targetRows.length, sourceRowHash, targetRowHash });
    }
  }
} finally {
  sourceHandle.close();
  db.close();
}
const report = {
  source,
  target,
  manifestFormat: manifest.format,
  manifestFiles: Array.isArray(manifest.files) ? manifest.files.length : 0,
  runtimeMutablePaths: mutablePatterns,
  transformedFiles: manifest.transformedFiles ?? [],
  sourceFiles: sourceFiles.length,
  targetFiles: targetFiles.length,
  fileMismatches,
  nonDbFileMismatches: fileMismatches.filter((entry) => entry.path !== "storage.sqlite"),
  manifestMismatches,
  sourceDb: sourceDigest,
  targetDb: targetDigest,
  sqliteIntegrity: integrity,
  matchingSqlite: sourceDigest.sha256 === targetDigest.sha256,
  tableContentMismatches,
  matchingSourceTableContent: tableContentMismatches.length === 0,
  runtimeMutableTables: [...dynamicTables],
  runtimeMutableColumns: [...runtimeMutableColumns],
  providerConfigOverlayColumns: [...overlayColumns],
  requiredFiles: {
    sqlite: true,
    manifest: true,
    // NAS deployments keep the runtime secrets in server.env rather than the
    // compose-level .env file. Either file is a valid imported environment
    // state; requiring only .env would reject a real NAS snapshot.
    env: (await exists(path.join(target, ".env"))) || (await exists(path.join(target, "server.env"))),
    logs: await exists(path.join(target, "logs")),
    backups: await exists(path.join(target, "db_backups")),
  },
  rowCounts: Object.fromEntries([
    "provider_connections", "api_keys", "combos", "key_value", "usage_history", "call_logs", "jobs", "job_runs", "a2a_tasks", "webhooks",
  ].map((table) => [table, count(table)])),
};
report.status = report.manifestFormat === 1 && report.matchingSourceTableContent && report.sqliteIntegrity === "ok" &&
  report.requiredFiles.manifest && report.requiredFiles.env && !report.nonDbFileMismatches.length &&
  !report.manifestMismatches ? "PASS" : "FAIL";
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
