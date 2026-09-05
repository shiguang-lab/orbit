import { Injectable } from "@nestjs/common";
import path from "path";
import fs from "fs";
import os from "os";
import { execFileSync } from "node:child_process";
import {
  listDbBackups,
  restoreDbBackup,
  backupDbFile,
  cleanupDbBackups,
  getDbBackupMaxFiles,
  setDbBackupMaxFiles,
  getDbBackupRetentionDays,
  setDbBackupRetentionDays,
  getDbInstance,
  resetDbInstance,
  SQLITE_FILE,
  openDatabaseAsync,
  getTableNamesFromAdapter,
  countImportedRows,
  unlinkFileWithRetry,
  setSystemPromptConfig,
  exportAllSummaryRows,
  CALL_LOGS_DIR,
} from "@shiguang-gateway/core-domain/db-backups/db";
import { getSettings } from "@shiguang-gateway/core-domain/control/settings";

const DEFAULT_MAX_UPLOAD_MB = 100;
const MAX_UPLOAD_MB_CEILING = 4096;
const REQUIRED_TABLES = ["provider_connections", "provider_nodes", "combos", "api_keys"];

export function resolveMaxUploadSizeBytes(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.SHIGUANG_GATEWAY_DB_IMPORT_MAX_MB;
  const parsed = raw === undefined ? NaN : Number(raw);
  const mb =
    Number.isFinite(parsed) && parsed >= 1
      ? Math.min(Math.floor(parsed), MAX_UPLOAD_MB_CEILING)
      : DEFAULT_MAX_UPLOAD_MB;
  return mb * 1024 * 1024;
}

@Injectable()
export class DbBackupsService {
  async listBackups() {
    return listDbBackups();
  }

  createManualBackup() {
    return backupDbFile("manual");
  }

  async restoreBackup(backupId: string) {
    return restoreDbBackup(backupId);
  }

  persistRetentionSettings(input: { keepLatest?: number; retentionDays?: number }) {
    const keepLatest = input.keepLatest ?? getDbBackupMaxFiles();
    const retentionDays = input.retentionDays ?? getDbBackupRetentionDays();

    if (input.keepLatest !== undefined) {
      setDbBackupMaxFiles(input.keepLatest);
    }
    if (input.retentionDays !== undefined) {
      setDbBackupRetentionDays(input.retentionDays);
    }

    return { keepLatest, retentionDays };
  }

  cleanupBackups(input: { keepLatest?: number; retentionDays?: number }) {
    const { keepLatest, retentionDays } = this.persistRetentionSettings(input);
    const result = cleanupDbBackups({ maxFiles: keepLatest, retentionDays });
    return {
      cleaned: true,
      keepLatest,
      retentionDays,
      ...result,
    };
  }

  async exportDbFile() {
    if (!SQLITE_FILE || !fs.existsSync(SQLITE_FILE)) {
      throw new Error("Database file not found");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportFilename = `shiguangGateway-backup-${timestamp}.sqlite`;
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, exportFilename);

    const db = getDbInstance();
    await db.backup(tmpPath);

    const { size: fileSize } = fs.statSync(tmpPath);
    return { tmpPath, exportFilename, fileSize };
  }

  async exportAllArchive() {
    if (!SQLITE_FILE) {
      throw new Error("Export is only available in local (non-cloud) mode");
    }

    const db = getDbInstance();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const tempDir = path.join(os.tmpdir(), `shiguangGateway-export-${timestamp}`);
    const zipPath = path.join(os.tmpdir(), `shiguangGateway-full-backup-${timestamp}.zip`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });

      const dbBackupPath = path.join(tempDir, "storage.sqlite");
      await db.backup(dbBackupPath);

      const { settings, combos, providers, apiKeys, reasoningRoutingRules } =
        exportAllSummaryRows();
      fs.writeFileSync(path.join(tempDir, "settings.json"), JSON.stringify(settings, null, 2));
      fs.writeFileSync(path.join(tempDir, "combos.json"), JSON.stringify(combos, null, 2));
      fs.writeFileSync(path.join(tempDir, "providers.json"), JSON.stringify(providers, null, 2));
      fs.writeFileSync(path.join(tempDir, "api-keys.json"), JSON.stringify(apiKeys, null, 2));
      fs.writeFileSync(
        path.join(tempDir, "reasoning-routing-rules.json"),
        JSON.stringify(reasoningRoutingRules, null, 2)
      );

      if (CALL_LOGS_DIR && fs.existsSync(CALL_LOGS_DIR)) {
        fs.cpSync(CALL_LOGS_DIR, path.join(tempDir, "call_logs"), { recursive: true });
      }

      const metadata = {
        exportedAt: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown",
        format: "shiguangGateway-full-backup-v1",
        contents: [
          "storage.sqlite - Full database",
          "settings.json - Key-value settings",
          "combos.json - Combo configurations",
          "providers.json - Provider connections (no credentials)",
          "api-keys.json - API key metadata (masked)",
          "reasoning-routing-rules.json - Reasoning routing policies",
          "call_logs/ - Detailed call log artifacts",
        ],
      };
      fs.writeFileSync(path.join(tempDir, "metadata.json"), JSON.stringify(metadata, null, 2));

      const tarPath = zipPath.replace(".zip", ".tar.gz");
      execFileSync("tar", ["-czf", tarPath, "-C", path.dirname(tempDir), path.basename(tempDir)], {
        timeout: 30000,
      });

      const archiveBuffer = fs.readFileSync(tarPath);

      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(tarPath);

      return {
        archiveBuffer,
        filename: `shiguangGateway-full-backup-${timestamp}.tar.gz`,
      };
    } catch (innerError) {
      try {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      } catch {
        /* ignore */
      }
      throw innerError;
    }
  }

  async importDb(fileBuffer: Buffer, fileName: string) {
    if (!fileName.endsWith(".sqlite")) {
      throw new Error("Invalid file type. Only .sqlite files are accepted.");
    }

    const maxUploadSize = resolveMaxUploadSizeBytes();
    const fileSize = fileBuffer.length;
    if (fileSize > maxUploadSize) {
      throw new Error(
        `File too large. Maximum allowed size is ${maxUploadSize / (1024 * 1024)} MB. ` +
        `Set SHIGUANG_GATEWAY_DB_IMPORT_MAX_MB to raise it, or VACUUM the database before exporting.`
      );
    }

    if (fileSize < 4096) {
      throw new Error("File too small to be a valid SQLite database.");
    }

    const tmpPath = path.join(os.tmpdir(), `shiguangGateway-import-${Date.now()}.sqlite`);
    fs.writeFileSync(tmpPath, fileBuffer);

    let testDb: any = null;
    try {
      testDb = await openDatabaseAsync(tmpPath, { readonly: true });
      const result = testDb.pragma("integrity_check") as any[];
      if (result[0]?.integrity_check !== "ok") {
        throw new Error("Database integrity check failed. The file may be corrupted.");
      }

      const tables = getTableNamesFromAdapter(testDb);
      const missingTables = REQUIRED_TABLES.filter((t) => !tables.includes(t));
      if (missingTables.length > 0) {
        throw new Error(`Invalid ShiguangGateway database. Missing tables: ${missingTables.join(", ")}`);
      }

      testDb.close();
      testDb = null;
    } catch (e) {
      if (testDb) testDb.close();
      throw e;
    }

    try {
      backupDbFile("pre-import");
      resetDbInstance();

      const sqliteFilesToReplace = [
        SQLITE_FILE,
        `${SQLITE_FILE}-wal`,
        `${SQLITE_FILE}-shm`,
        `${SQLITE_FILE}-journal`,
      ];
      for (const filePath of sqliteFilesToReplace) {
        if (!filePath) continue;
        await unlinkFileWithRetry(filePath);
      }

      fs.copyFileSync(tmpPath, SQLITE_FILE!);

      getDbInstance();
      const { connCount, nodeCount, comboCount, keyCount } = countImportedRows();

      try {
        const importedSettings = await getSettings();
        if (importedSettings.systemPrompt) {
          setSystemPromptConfig(importedSettings.systemPrompt);
        }
      } catch {
        /* ignore */
      }

      return {
        imported: true,
        filename: fileName,
        connectionCount: connCount,
        nodeCount,
        comboCount,
        apiKeyCount: keyCount,
      };
    } finally {
      if (tmpPath && fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          /* best effort */
        }
      }
    }
  }
}
