import fs from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import {
  ANTIGRAVITY_MITM_PROFILE,
  KIRO_MITM_PROFILE,
  generateCert,
  getCachedPassword,
  getMitmStatus,
  isRoot,
  resolveMitmDataDir,
  setCachedPassword,
  startMitm,
  stopMitm,
} from "@orbit/core/shared/mitm";
import { resolveApiKey } from "@orbit/core/shared/api-key-resolver";

export const DEFAULT_MITM_PORT = 443;
export const MITM_PORT_ERROR =
  "Transparent MITM interception currently requires port 443 because DNS override does not redirect destination ports.";

type MitmTargetRoute = {
  id: string;
  name: string;
  targetHost: string;
  targetPort: number;
  localPort: number;
  endpoints: string[];
  enabled: boolean;
};

type MitmStats = {
  startedAt: string | null;
  totalRequests: number;
  interceptedRequests: number;
  activeConnections: number;
  lastRequestAt: string | null;
  lastInterceptAt: string | null;
};

type MitmConfig = { port: number; targets: MitmTargetRoute[] };

function mitmDir(): string {
  return path.join(resolveMitmDataDir(), "mitm");
}
function configPath(): string {
  return path.join(mitmDir(), "settings.json");
}
function statsPath(): string {
  return path.join(mitmDir(), "stats.json");
}
function certPath(): string {
  return path.join(mitmDir(), "server.crt");
}
function keyPath(): string {
  return path.join(mitmDir(), "server.key");
}

function defaultTargets(port = DEFAULT_MITM_PORT): MitmTargetRoute[] {
  const allHosts = [
    ANTIGRAVITY_MITM_PROFILE.targetHost,
    ...(ANTIGRAVITY_MITM_PROFILE.additionalHosts || []),
  ];
  return [
    {
      id: ANTIGRAVITY_MITM_PROFILE.id,
      name: ANTIGRAVITY_MITM_PROFILE.name,
      targetHost: allHosts.join(", "),
      targetPort: ANTIGRAVITY_MITM_PROFILE.targetPort,
      localPort: port,
      endpoints: ANTIGRAVITY_MITM_PROFILE.apiEndpoints,
      enabled: true,
    },
    {
      id: KIRO_MITM_PROFILE.id,
      name: KIRO_MITM_PROFILE.name,
      targetHost: KIRO_MITM_PROFILE.targetHost,
      targetPort: KIRO_MITM_PROFILE.targetPort,
      localPort: KIRO_MITM_PROFILE.localPort,
      endpoints: KIRO_MITM_PROFILE.apiEndpoints,
      enabled: false,
    },
  ];
}

function readConfig(): MitmConfig {
  try {
    JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    // A missing or malformed file falls back to the safe default.
  }
  return { port: DEFAULT_MITM_PORT, targets: defaultTargets(DEFAULT_MITM_PORT) };
}

function writeConfig(): void {
  fs.mkdirSync(mitmDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify({ port: DEFAULT_MITM_PORT }, null, 2));
}

function readStats(): MitmStats {
  try {
    const raw = JSON.parse(fs.readFileSync(statsPath(), "utf8")) as Record<string, unknown>;
    return {
      startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
      totalRequests: Number(raw.totalRequests || 0),
      interceptedRequests: Number(raw.interceptedRequests || 0),
      activeConnections: Number(raw.activeConnections || 0),
      lastRequestAt: typeof raw.lastRequestAt === "string" ? raw.lastRequestAt : null,
      lastInterceptAt: typeof raw.lastInterceptAt === "string" ? raw.lastInterceptAt : null,
    };
  } catch {
    return {
      startedAt: null,
      totalRequests: 0,
      interceptedRequests: 0,
      activeConnections: 0,
      lastRequestAt: null,
      lastInterceptAt: null,
    };
  }
}

@Injectable()
export class MitmService {
  async getSettings() {
    const status = await getMitmStatus();
    const config = readConfig();
    return {
      running: status.running,
      pid: status.pid || null,
      dnsConfigured: status.dnsConfigured || false,
      certExists: status.certExists || fs.existsSync(certPath()),
      hasCachedPassword: !!getCachedPassword(),
      port: config.port,
      targets: config.targets,
      stats: readStats(),
    };
  }

  getCertificate(): Buffer | null {
    const file = certPath();
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  }

  async update(
    input: { enabled?: boolean; apiKey?: string; keyId?: string; sudoPassword?: string; port?: number },
  ) {
    const config = readConfig();
    if (input.port !== undefined && input.port !== DEFAULT_MITM_PORT) {
      throw new MitmValidationError(MITM_PORT_ERROR);
    }
    if (input.port !== undefined) {
      config.port = DEFAULT_MITM_PORT;
      config.targets = defaultTargets(config.port);
      writeConfig();
    }

    if (typeof input.enabled === "boolean") {
      const cachedPassword = getCachedPassword();
      const password = input.sudoPassword || cachedPassword || "";
      const isWindows = process.platform === "win32";
      const root = !isWindows && isRoot();
      if (input.enabled) {
        const apiKey = await resolveApiKey(input.keyId || null, input.apiKey || null);
        if (!apiKey || (!isWindows && !root && !password)) {
          throw new MitmValidationError(isWindows ? "Missing apiKey" : "Missing apiKey or sudoPassword");
        }
        await startMitm(apiKey, password, { port: config.port });
        if (!isWindows) setCachedPassword(password);
      } else {
        if (!isWindows && !root && !password) throw new MitmValidationError("Missing sudoPassword");
        await stopMitm(password);
        if (!isWindows && input.sudoPassword) setCachedPassword(input.sudoPassword);
      }
    }
    return this.getSettings();
  }

  async regenerateCertificate() {
    const status = await getMitmStatus();
    if (status.running) throw new MitmConflictError("Stop the MITM proxy before regenerating certificates");
    for (const file of [certPath(), keyPath()]) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {
        // Best effort cleanup; generateCert reports any subsequent failure.
      }
    }
    await generateCert({ force: true });
    return this.getSettings();
  }
}

export class MitmValidationError extends Error {}
export class MitmConflictError extends Error {}
