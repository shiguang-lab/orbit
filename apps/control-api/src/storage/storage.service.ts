import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import path from "node:path";
import { resolveDataDir } from "@shiguang-gateway/core-domain/shared/data-paths";
import { getAppLogRetentionDays, getCallLogRetentionDays, getCallLogsTableMaxRows, getProxyLogsTableMaxRows } from "@shiguang-gateway/core-domain/shared/log-env";
import { getDbBackupMaxFiles, getDbBackupRetentionDays } from "@shiguang-gateway/core-domain/db-backups/db";
import { sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

@Injectable()
export class StorageService {
  getHealth() {
    try {
      const dataDir = resolveDataDir({});
      const dbFilePath = path.join(dataDir, "storage.sqlite");
      const backupsDir = path.join(dataDir, "db_backups");
      let sizeBytes = 0;
      try { if (fs.existsSync(dbFilePath)) sizeBytes = fs.statSync(dbFilePath).size; } catch { /* best effort */ }
      let lastBackupAt: string | null = null;
      let backupCount = 0;
      try {
        if (fs.existsSync(backupsDir)) {
          const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith("db_") && f.endsWith(".sqlite")).sort().reverse();
          backupCount = files.length;
          if (files[0]) lastBackupAt = fs.statSync(path.join(backupsDir, files[0])).mtime.toISOString();
        }
      } catch { /* best effort */ }
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      const display = (value: string) => value.startsWith(homeDir) ? "~" + value.slice(homeDir.length) : value;
      return {
        status: 200,
        body: {
          driver: "sqlite", dbPath: display(dbFilePath), sizeBytes, lastBackupAt, backupCount,
          retentionDays: { app: getAppLogRetentionDays(), call: getCallLogRetentionDays() },
          tableMaxRows: { callLogs: getCallLogsTableMaxRows(), proxyLogs: getProxyLogsTableMaxRows() },
          backupRetention: { maxFiles: getDbBackupMaxFiles(), days: getDbBackupRetentionDays() },
          dataDir: display(dataDir),
        },
      };
    } catch (error) {
      console.error("[API] Error getting storage health:", sanitizeErrorMessage(error));
      return { status: 500, body: { error: sanitizeErrorMessage(error) } };
    }
  }
}
