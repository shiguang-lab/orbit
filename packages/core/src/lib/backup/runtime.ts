import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { resolveDataDir } from "@orbit/config/dataPaths";
import { tryOpenSync } from "../db/adapters/driverFactory.js";

const FILES_TO_BACKUP = ["storage.sqlite", "settings.json", "combos.json", "providers.json"] as const;

export interface BackupManifest {
  timestamp: string;
  version: "shiguangGateway-cli-v1";
  encrypted: boolean;
  files: string[];
}

export interface CreateBackupOptions {
  dataDir?: string;
  name?: string;
  encrypt?: boolean;
  passphrase?: string;
  exclude?: string[];
  retention?: number;
  now?: Date;
  upload?: (backupPath: string, manifest: BackupManifest) => Promise<boolean>;
}

export interface CreateBackupResult {
  backupPath: string;
  backedUp: number;
  skipped: number;
  encrypted: boolean;
  cloudUploaded: boolean | null;
  manifest: BackupManifest | null;
}

function matchesGlob(fileName: string, pattern: string): boolean {
  if (!pattern.includes("*")) return fileName === pattern;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(fileName);
}

function shouldExclude(fileName: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(fileName, pattern));
}

async function encryptFile(sourcePath: string, destinationPath: string, passphrase: string): Promise<void> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const temporaryPath = `${destinationPath}.ciphertext`;
  await pipeline(createReadStream(sourcePath), cipher, createWriteStream(temporaryPath));
  const output = createWriteStream(destinationPath);
  try {
    await new Promise<void>((resolve, reject) => {
      output.write(Buffer.concat([salt, iv, cipher.getAuthTag()]), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await pipeline(createReadStream(temporaryPath), output);
  } finally {
    try {
      unlinkSync(temporaryPath);
    } catch {}
  }
}

async function backupSqliteFile(sourcePath: string, destinationPath: string): Promise<void> {
  const database = tryOpenSync(sourcePath, { readonly: true, fileMustExist: true });
  if (!database) throw new Error("No SQLite driver is available for backup");
  try {
    await database.backup(destinationPath);
  } finally {
    database.close();
  }
}

function pruneBackups(backupDir: string, retention: number | undefined): void {
  if (!retention || retention <= 0 || !existsSync(backupDir)) return;
  try {
    const directories = readdirSync(backupDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("shiguangGateway-backup-"))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const directory of directories.slice(retention)) {
      try {
        rmSync(join(backupDir, directory), { recursive: true, force: true });
      } catch {}
    }
  } catch {}
}

/** Create a local backup without CLI prompts, translations, process exits, or global lifecycle hooks. */
export async function createBackup(options: CreateBackupOptions = {}): Promise<CreateBackupResult> {
  const dataDir = options.dataDir ?? resolveDataDir();
  const backupDir = join(dataDir, "backups");
  const timestamp = (options.now ?? new Date()).toISOString();
  const safeName = options.name?.replace(/[/\\]/g, "_");
  const backupName = safeName
    ? `shiguangGateway-backup-${safeName}`
    : `shiguangGateway-backup-${timestamp.replace(/[:.]/g, "-").slice(0, 19)}`;
  const backupPath = join(backupDir, backupName);
  const exclude = options.exclude ?? [];
  if (options.encrypt && !options.passphrase) {
    throw new Error("Encrypted backup requires a passphrase");
  }

  mkdirSync(backupDir, { recursive: true });
  let backedUp = 0;
  let skipped = 0;
  const files: string[] = [];
  for (const fileName of FILES_TO_BACKUP) {
    const sourcePath = join(dataDir, fileName);
    if (shouldExclude(fileName, exclude) || !existsSync(sourcePath)) {
      skipped += 1;
      continue;
    }
    mkdirSync(backupPath, { recursive: true });
    const destinationName = options.encrypt ? `${fileName}.enc` : fileName;
    const destinationPath = join(backupPath, destinationName);
    if (fileName.endsWith(".sqlite")) {
      const plainPath = options.encrypt ? join(backupPath, basename(fileName)) : destinationPath;
      await backupSqliteFile(sourcePath, plainPath);
      if (options.encrypt) {
        try {
          await encryptFile(plainPath, destinationPath, options.passphrase!);
        } finally {
          try {
            unlinkSync(plainPath);
          } catch {}
        }
      }
    } else if (options.encrypt) {
      await encryptFile(sourcePath, destinationPath, options.passphrase!);
    } else {
      copyFileSync(sourcePath, destinationPath);
    }
    files.push(destinationName);
    backedUp += 1;
  }

  if (backedUp === 0) {
    return { backupPath, backedUp, skipped, encrypted: Boolean(options.encrypt), cloudUploaded: null, manifest: null };
  }

  const manifest: BackupManifest = {
    timestamp,
    version: "shiguangGateway-cli-v1",
    encrypted: Boolean(options.encrypt),
    files,
  };
  writeFileSync(join(backupPath, "backup-info.json"), JSON.stringify(manifest, null, 2), "utf8");
  const cloudUploaded = options.upload ? await options.upload(backupPath, manifest) : null;
  pruneBackups(backupDir, options.retention);
  return { backupPath, backedUp, skipped, encrypted: manifest.encrypted, cloudUploaded, manifest };
}

export interface BackupSchedule {
  enabled?: boolean;
  cron?: string;
  cloud?: boolean;
  encrypt?: boolean;
  retention?: number | null;
  updatedAt?: string;
  lastRunAt?: string;
}

export function getBackupSchedulePath(dataDir = resolveDataDir()): string {
  return join(dataDir, "backup-schedule.json");
}

export function readBackupSchedule(dataDir = resolveDataDir()): BackupSchedule | null {
  const result = readBackupScheduleResult(dataDir);
  return result.status === "valid" ? result.schedule : null;
}

export type BackupScheduleReadResult =
  | { status: "missing" }
  | { status: "invalid"; error: unknown }
  | { status: "valid"; schedule: BackupSchedule };

export function readBackupScheduleResult(dataDir = resolveDataDir()): BackupScheduleReadResult {
  const schedulePath = getBackupSchedulePath(dataDir);
  if (!existsSync(schedulePath)) return { status: "missing" };
  try {
    return { status: "valid", schedule: JSON.parse(readFileSync(schedulePath, "utf8")) as BackupSchedule };
  } catch (error) {
    return { status: "invalid", error };
  }
}

export function writeBackupSchedule(schedule: BackupSchedule, dataDir = resolveDataDir()): void {
  const schedulePath = getBackupSchedulePath(dataDir);
  mkdirSync(dirname(schedulePath), { recursive: true });
  const temporaryPath = `${schedulePath}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  try {
    writeFileSync(temporaryPath, JSON.stringify(schedule, null, 2), "utf8");
    renameSync(temporaryPath, schedulePath);
  } finally {
    try {
      unlinkSync(temporaryPath);
    } catch {}
  }
}
