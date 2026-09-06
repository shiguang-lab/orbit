import path from "node:path";
import os from "node:os";
import fs from "node:fs";

/** Canonical application data-path policy shared by server-side applications. */
export const APP_NAME = "shiguangGateway";

function fallbackHomeDir() {
  const envHome = process.env.HOME || process.env.USERPROFILE;
  if (typeof envHome === "string" && envHome.trim().length > 0) return path.resolve(envHome);
  return os.tmpdir();
}

function safeHomeDir() {
  try {
    return os.homedir();
  } catch {
    return fallbackHomeDir();
  }
}

function normalizeConfiguredPath(dir: unknown): string | null {
  if (typeof dir !== "string") return null;
  const trimmed = dir.trim();
  if (!trimmed) return null;
  return path.resolve(trimmed);
}

export function getLegacyDotDataDir() {
  return path.join(safeHomeDir(), `.${APP_NAME}`);
}

export function getDefaultDataDir() {
  const homeDir = safeHomeDir();
  const legacyDir = getLegacyDotDataDir();
  if (fs.existsSync(legacyDir)) {
    try {
      if (fs.statSync(legacyDir).isDirectory()) return legacyDir;
    } catch {
      // Ignore stat errors.
    }
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    return path.join(appData, APP_NAME);
  }

  const xdgConfigHome = normalizeConfiguredPath(process.env.XDG_CONFIG_HOME);
  if (xdgConfigHome) return path.join(xdgConfigHome, APP_NAME);
  return legacyDir;
}

export function resolveDataDir({ isCloud = false }: { isCloud?: boolean } = {}): string {
  if (isCloud) return "/tmp";
  const configured = normalizeConfiguredPath(process.env.DATA_DIR);
  if (configured) return configured;
  return getDefaultDataDir();
}

export function resolveStoragePath(dataDir = resolveDataDir()): string {
  return path.join(dataDir, "storage.sqlite");
}

export function isTestContext(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    !!process.env.VITEST ||
    !!process.env.NODE_TEST_CONTEXT ||
    process.execArgv.includes("--test") ||
    process.argv.includes("--test")
  );
}

let testContextDataDir: string | null = null;

export function resolveWritableDataDir({ isCloud = false }: { isCloud?: boolean } = {}): string {
  const resolved = resolveDataDir({ isCloud });
  if (isCloud) return resolved;

  if (
    !process.env.DATA_DIR &&
    isTestContext() &&
    process.env.SHIGUANG_GATEWAY_ALLOW_DEFAULT_DATA_DIR !== "1"
  ) {
    if (!testContextDataDir) {
      testContextDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `${APP_NAME}-testctx-`));
      console.warn(
        `[DATA_DIR] test context without DATA_DIR → using '${testContextDataDir}' instead of ` +
          `'${resolved}'. Set DATA_DIR explicitly (or load tests/_setup/isolateDataDir.ts) to silence this.`
      );
    }
    return testContextDataDir;
  }

  const configured = normalizeConfiguredPath(process.env.DATA_DIR);
  if (!configured) return resolved;

  try {
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException | null)?.code;
    if (code === "EACCES" || code === "EPERM") {
      const fallback = getDefaultDataDir();
      console.warn(`[DATA_DIR] '${resolved}' is not writable (${code}) → falling back to '${fallback}'`);
      return fallback;
    }
    throw err;
  }
}

export function isSamePath(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normalizedA = path.resolve(a);
  const normalizedB = path.resolve(b);
  if (process.platform === "win32") return normalizedA.toLowerCase() === normalizedB.toLowerCase();
  return normalizedA === normalizedB;
}
