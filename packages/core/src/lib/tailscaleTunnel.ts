import { execFile, spawn } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
import http from "http";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getSettings, updateSettings } from "./db/settings.ts";
import { resolveDataDir } from "./dataPaths.ts";
import { getRuntimePorts } from "./runtime/ports.ts";
import { getCachedPassword, setCachedPassword } from "../mitm/manager.ts";
import { execFileWithPassword } from "../mitm/systemCommands.ts";
import { getConsistentMachineId } from "../shared/utils/machineId.ts";

const execFileAsync = promisify(execFile);

const WINDOWS_TAILSCALE_BIN = "C:\\Program Files\\Tailscale\\tailscale.exe";
const WINDOWS_TAILSCALED_BIN = "C:\\Program Files\\Tailscale\\tailscaled.exe";

// Runtime platform getter. A bundler (Turbopack in `next build`) constant-folds
// `process.platform` to the BUILD machine's value on a non-Windows runner and prunes
// the other branches as dead code (#10293). `os.platform()` is a runtime call a
// bundler cannot fold, so Windows/macOS/Linux branches survive on any build machine.
function getCurrentPlatform(): NodeJS.Platform {
  return os.platform();
}

const EXTENDED_PATH = `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`;
const LOGIN_TIMEOUT_MS = 15000;
const FUNNEL_TIMEOUT_MS = 30000;

// System-level tailscaled socket (used by apt/brew installed tailscale)
const SYSTEM_SOCKET_LINUX = "/var/run/tailscale/tailscaled.sock";
const SYSTEM_SOCKET_MAC = "/var/run/tailscaled.sock";

/** Cached active socket path — avoids repeated probing during a single request */
let _cachedActiveSocket: string | null = null;
let _cachedActiveSocketTimestamp = 0;
const SOCKET_CACHE_TTL_MS = 10_000;

type JsonRecord = Record<string, unknown>;

export type TailscaleTunnelInstallSource = "managed" | "path" | "env" | "windows-default";
export type TailscaleTunnelPhase =
  "unsupported" | "not_installed" | "needs_login" | "stopped" | "running" | "error";

type PersistedTailscaleState = {
  binaryPath?: string | null;
  installSource?: TailscaleTunnelInstallSource | null;
  daemonPid?: number | null;
  tunnelUrl?: string | null;
  lastError?: string | null;
  installedAt?: string | null;
  updatedAt?: string | null;
};

type BinaryResolution = {
  binaryPath: string | null;
  installSource: TailscaleTunnelInstallSource | null;
  managedInstall: boolean;
};

type TailscaleLoginResult = { alreadyLoggedIn: true } | { authUrl: string };

type TailscaleFunnelResult =
  { tunnelUrl: string } | { funnelNotEnabled: true; enableUrl: string | null };

export type TailscaleCheckStatus = {
  supported: boolean;
  installed: boolean;
  managedInstall: boolean;
  installSource: TailscaleTunnelInstallSource | null;
  binaryPath: string | null;
  loggedIn: boolean;
  daemonRunning: boolean;
  running: boolean;
  tunnelUrl: string | null;
  apiUrl: string | null;
  platform: NodeJS.Platform;
  brewAvailable: boolean;
  lastError: string | null;
  pid: number | null;
  connected: boolean;
  ip: string | null;
  ipv6: string | null;
  hostname: string | null;
  magicDns: string | null;
  tailscaleUrl: string | null;
  publicUrl: string | null;
  mode: "tsnet" | "daemon" | "external" | "manual";
  source: string;
  socketPath: string | null;
  backendState: string | null;
};

export type TailscaleTunnelStatus = TailscaleCheckStatus & {
  enabled: boolean;
  phase: TailscaleTunnelPhase;
};

export type TailscaleEnableResult =
  | {
      success: true;
      tunnelUrl: string;
      apiUrl: string | null;
      status: TailscaleTunnelStatus;
    }
  | {
      success: false;
      needsLogin: true;
      authUrl: string;
      status: TailscaleTunnelStatus;
    }
  | {
      success: false;
      funnelNotEnabled: true;
      enableUrl: string | null;
      status: TailscaleTunnelStatus;
    };

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function isSupportedPlatform(platform = os.platform()) {
  return platform === "darwin" || platform === "linux" || platform === "win32";
}

function getTailscaleDir() {
  return path.join(resolveDataDir(), "tailscale");
}

function getManagedBinaryPath(platform = os.platform()) {
  return path.join(getTailscaleDir(), "bin", platform === "win32" ? "tailscale.exe" : "tailscale");
}

function getStateFilePath() {
  return path.join(getTailscaleDir(), "state.json");
}

function getPidFilePath() {
  return path.join(getTailscaleDir(), ".tailscaled.pid");
}

function getLogFilePath() {
  return path.join(getTailscaleDir(), "tailscaled.log");
}

export function getTailscaleSocketPath() {
  return path.join(getTailscaleDir(), "tailscaled.sock");
}

async function ensureTailscaleDir() {
  await fsPromises.mkdir(path.join(getTailscaleDir(), "bin"), { recursive: true });
}

async function readStateFile(): Promise<PersistedTailscaleState> {
  try {
    const raw = await fsPromises.readFile(getStateFilePath(), "utf8");
    return JSON.parse(raw) as PersistedTailscaleState;
  } catch {
    return {};
  }
}

async function writeStateFile(state: PersistedTailscaleState) {
  await ensureTailscaleDir();
  await fsPromises.writeFile(getStateFilePath(), JSON.stringify(state, null, 2) + "\n", "utf8");
}

async function updateStateFile(patch: Partial<PersistedTailscaleState>) {
  const current = await readStateFile();
  await writeStateFile({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

async function readPidFile() {
  try {
    const raw = await fsPromises.readFile(getPidFilePath(), "utf8");
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

async function clearPidFile() {
  try {
    await fsPromises.unlink(getPidFilePath());
  } catch {
    // Ignore stale or missing pid files.
  }
}

function isProcessAlive(pid: number | null) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getTailscaleApiUrl(tunnelUrl: string | null) {
  return tunnelUrl ? `${tunnelUrl.replace(/\/$/, "")}/v1` : null;
}

async function resolvePathCommand(command: string) {
  const lookupCommand = os.platform() === "win32" ? "where" : "which";
  try {
    const { stdout } = await execFileAsync(lookupCommand, [command], {
      timeout: 3000,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: EXTENDED_PATH,
      },
    });
    const first = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    return first || null;
  } catch {
    return null;
  }
}

const CANDIDATE_NAS_BINARIES = [
  process.env.TAILSCALE_BIN,
  "/var/packages/Tailscale/target/bin/tailscale", // Synology DSM
  "/usr/local/bin/tailscale",
  "/usr/bin/tailscale",
  "/opt/homebrew/bin/tailscale",
  "/share/CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale", // QNAP
  "C:\\Program Files\\Tailscale\\tailscale.exe",
].filter((p): p is string => Boolean(p && typeof p === "string"));

export const CANDIDATE_NAS_SOCKETS = [
  process.env.TAILSCALE_SOCKET,
  "/var/run/tailscale/tailscaled.sock",
  "/run/tailscale/tailscaled.sock",
  "/host/var/run/tailscale/tailscaled.sock",
  "/host/run/tailscale/tailscaled.sock",
  "/var/run/tailscaled.sock",
  "/host/var/run/tailscaled.sock",
  "/tmp/tailscaled.sock",
  "/host/tmp/tailscaled.sock",
  // Synology DSM 6 / 7 package paths
  "/var/packages/Tailscale/var/tailscaled.sock",
  "/var/packages/Tailscale/etc/tailscaled.sock",
  "/var/packages/Tailscale/target/var/tailscaled.sock",
  "/volume1/@appdata/Tailscale/tailscaled.sock",
  "/volume2/@appdata/Tailscale/tailscaled.sock",
  "/volume3/@appdata/Tailscale/tailscaled.sock",
  "/volume4/@appdata/Tailscale/tailscaled.sock",
  // QNAP QPKG paths
  "/share/CACHEDEV1_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  "/share/CACHEDEV2_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  "/share/MD0_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  "/share/MD1_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  path.join(os.homedir(), ".tailscale", "tailscaled.sock"),
  path.join(os.homedir(), "Library/Containers/io.tailscale.ipn.macsys/Data/tailscaled.sock"),
].filter((p): p is string => Boolean(p && typeof p === "string"));

// Memory cache for passive request discovery (e.g. Docker bridge mode accessed via Tailscale IP/domain)
let _lastPassiveTailscaleHost: string | null = null;
let _lastPassiveTailscaleTimestamp = 0;
const PASSIVE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function isTailscaleIpv4(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [first, second] = parts;
  return first === 100 && second >= 64 && second <= 127;
}

export function isTailscaleIpv6(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const normalized = ip.trim().toLowerCase();
  return normalized.startsWith("fd7a:115c:a1e0:") || normalized.startsWith("fd7a:115c:a1e0::");
}

export function isTailscaleHost(host: string): boolean {
  if (!host || typeof host !== "string") return false;
  const cleanHost = host.trim().toLowerCase().split(":")[0].replace(/^\[|\]$/g, "");
  if (isTailscaleIpv4(cleanHost) || isTailscaleIpv6(cleanHost)) return true;
  return (
    cleanHost.endsWith(".ts.net") ||
    cleanHost.endsWith(".tailscale.net") ||
    cleanHost.includes(".ts.net") ||
    cleanHost.includes(".tailscale.net")
  );
}

export function recordPassiveTailscaleHost(hostHeader?: string | string[] | null): void {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (!raw) return;
  const host = raw.trim();
  if (isTailscaleHost(host)) {
    _lastPassiveTailscaleHost = host;
    _lastPassiveTailscaleTimestamp = Date.now();
  }
}

async function queryTailscaleLocalApi(socketPath: string): Promise<JsonRecord | null> {
  return new Promise((resolve) => {
    try {
      const req = http.request(
        {
          socketPath,
          path: "/localapi/v0/status",
          method: "GET",
          headers: {
            Host: "local-tailscale",
            "Sec-Tailscale": "localapi",
          },
          timeout: 2000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data) as JsonRecord);
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        },
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

async function resolveBinary(): Promise<BinaryResolution> {
  for (const binPath of CANDIDATE_NAS_BINARIES) {
    if (binPath && fs.existsSync(binPath)) {
      return { binaryPath: binPath, installSource: binPath === process.env.TAILSCALE_BIN ? "env" : "path", managedInstall: false };
    }
  }

  const managedPath = getManagedBinaryPath();
  if (fs.existsSync(managedPath)) {
    return { binaryPath: managedPath, installSource: "managed", managedInstall: true };
  }

  const pathBinary = await resolvePathCommand("tailscale");
  if (pathBinary) {
    return { binaryPath: pathBinary, installSource: "path", managedInstall: false };
  }

  if (getCurrentPlatform() === "win32" && fs.existsSync(WINDOWS_TAILSCALE_BIN)) {
    return {
      binaryPath: WINDOWS_TAILSCALE_BIN,
      installSource: "windows-default",
      managedInstall: false,
    };
  }

  return { binaryPath: null, installSource: null, managedInstall: false };
}

async function resolveDaemonBinary(tailscaleBinaryPath: string | null) {
  const envPath = toNonEmptyString(process.env.TAILSCALED_BIN);
  if (envPath && fs.existsSync(envPath)) return envPath;

  const daemonFilename = os.platform() === "win32" ? "tailscaled.exe" : "tailscaled";
  const siblingDir = tailscaleBinaryPath ? path.dirname(tailscaleBinaryPath) : null;
  // path.format avoids the path.join/resolve pattern flagged by CWE-22 linters;
  // siblingDir is path.dirname of a trusted system binary from resolveBinary(), not user input.
  const sibling = siblingDir ? path.format({ dir: siblingDir, base: daemonFilename }) : null;
  if (sibling && fs.existsSync(sibling)) return sibling;

  const pathBinary = await resolvePathCommand("tailscaled");
  if (pathBinary) return pathBinary;

  if (getCurrentPlatform() === "win32" && fs.existsSync(WINDOWS_TAILSCALED_BIN))
    return WINDOWS_TAILSCALED_BIN;

  return null;
}

function buildExecEnv() {
  return {
    ...process.env,
    PATH: EXTENDED_PATH,
  };
}

/**
 * Probe which tailscaled socket is actually live and responding to LocalAPI.
 */
export async function findActiveSocketWithStatus(): Promise<{ socketPath: string; status: JsonRecord } | null> {
  const now = Date.now();
  if (_cachedActiveSocket && now - _cachedActiveSocketTimestamp < SOCKET_CACHE_TTL_MS) {
    try {
      if (fs.existsSync(_cachedActiveSocket)) {
        const cachedStatus = await queryTailscaleLocalApi(_cachedActiveSocket);
        if (cachedStatus) {
          return { socketPath: _cachedActiveSocket, status: cachedStatus };
        }
      }
    } catch {
      _cachedActiveSocket = null;
    }
  }

  for (const socketPath of CANDIDATE_NAS_SOCKETS) {
    try {
      if (fs.existsSync(socketPath)) {
        const status = await queryTailscaleLocalApi(socketPath);
        if (status) {
          _cachedActiveSocket = socketPath;
          _cachedActiveSocketTimestamp = now;
          return { socketPath, status };
        }
      }
    } catch {
      // Continue
    }
  }
  return null;
}

/**
 * Probe which tailscaled socket is actually live.
 * Priority: system daemon socket → Orbit custom socket.
 * When the system daemon is running (e.g. via systemd), we MUST use its socket
 * because only one tailscaled can hold the TUN device.
 */
async function getActiveSocketPath(): Promise<string> {
  const active = await findActiveSocketWithStatus();
  if (active) return active.socketPath;

  for (const socketPath of CANDIDATE_NAS_SOCKETS) {
    if (socketPath && fs.existsSync(socketPath)) {
      return socketPath;
    }
  }

  // Fallback to Orbit custom socket
  const customSocket = getTailscaleSocketPath();
  _cachedActiveSocket = customSocket;
  _cachedActiveSocketTimestamp = Date.now();
  return customSocket;
}

/** Synchronous check: is the system daemon socket available? */
function isSystemDaemonAvailable(): boolean {
  for (const socketPath of CANDIDATE_NAS_SOCKETS) {
    if (socketPath && fs.existsSync(socketPath)) return true;
  }
  return false;
}

/** Invalidate socket cache so the next call re-probes */
function invalidateSocketCache() {
  _cachedActiveSocket = null;
  _cachedActiveSocketTimestamp = 0;
}

/**
 * Build the `tailscale up` argument list. When an auth key is provided (e.g. from
 * the `TAILSCALE_AUTHKEY` env var) it is passed via `--auth-key=` so a
 * pre-authenticated / headless daemon logs in non-interactively instead of waiting
 * for (and timing out on) an interactive auth URL. (#1263) The key is an argv
 * element passed to `spawn(binary, args)` with no shell, so it is not shell-interpolated.
 */
export function tailscaleUpArgs(hostname?: string, authKey?: string): string[] {
  return [
    "up",
    "--accept-routes",
    ...(hostname ? [`--hostname=${hostname}`] : []),
    ...(authKey ? [`--auth-key=${authKey}`] : []),
  ];
}

async function buildTailscaleArgs(...args: string[]) {
  if (getCurrentPlatform() === "win32") return args;
  const socket = await getActiveSocketPath();
  return ["--socket", socket, ...args];
}

/** Synchronous variant for places that cannot await */
function buildTailscaleArgsSync(...args: string[]) {
  if (getCurrentPlatform() === "win32") return args;
  const socket =
    _cachedActiveSocket ||
    CANDIDATE_NAS_SOCKETS.find((p) => fs.existsSync(p)) ||
    getTailscaleSocketPath();
  return ["--socket", socket, ...args];
}

async function readJsonCommand(binaryPath: string, args: string[], timeout = 5000) {
  try {
    const { stdout } = await execFileAsync(binaryPath, args, {
      timeout,
      windowsHide: true,
      env: buildExecEnv(),
    });
    return JSON.parse(stdout) as JsonRecord;
  } catch {
    return null;
  }
}

export type TailscaleNodeDetails = {
  connected: boolean;
  loggedIn: boolean;
  daemonRunning: boolean;
  ip: string | null;
  ipv6: string | null;
  hostname: string | null;
  magicDns: string | null;
  tailscaleUrl: string | null;
  apiUrl: string | null;
  mode: "tsnet" | "daemon" | "external" | "manual";
  source: "env" | "localapi-socket" | "cli" | "network-interface" | "passive-request" | "none";
  socketPath: string | null;
  binaryPath: string | null;
  backendState: string | null;
  statusPayload: JsonRecord | null;
};

export async function detectTailscaleNode(
  binaryPath: string | null,
  opts: { requestHost?: string | null; port?: number | string } = {},
): Promise<TailscaleNodeDetails> {
  const { apiPort } = getRuntimePorts();
  const port = opts.port || process.env.PORT || process.env.EDGE_GATEWAY_PORT || apiPort;

  // Layer 1: Check environment variables (Explicit NAS Docker configuration)
  const envUrl = process.env.TAILSCALE_URL?.trim();
  const envIp = process.env.TAILSCALE_IP?.trim() || (process.env.OMNIROUTE_BIND_HOST && isTailscaleIpv4(process.env.OMNIROUTE_BIND_HOST) ? process.env.OMNIROUTE_BIND_HOST.trim() : null);
  const envDomain = (process.env.TAILSCALE_HOSTNAME || process.env.TS_DOMAIN || process.env.MAGIC_DNS)?.trim();

  if (envUrl || envIp || envDomain) {
    let parsedIp = envIp || null;
    let parsedDns = envDomain || null;
    if (envUrl) {
      try {
        const u = new URL(envUrl);
        if (isTailscaleIpv4(u.hostname)) {
          parsedIp = parsedIp || u.hostname;
        } else if (u.hostname.includes(".")) {
          parsedDns = parsedDns || u.hostname;
        }
      } catch {}
    }
    const tailscaleUrl = envUrl || (parsedDns ? `https://${parsedDns}` : `http://${parsedIp}:${port}`);
    const syntheticPayload: JsonRecord = {
      BackendState: "Running",
      Self: {
        DNSName: parsedDns ? `${parsedDns}.` : "",
        TailscaleIPs: parsedIp ? [parsedIp] : [],
        HostName: envDomain || os.hostname(),
      },
    };
    return {
      connected: true,
      loggedIn: true,
      daemonRunning: true,
      ip: parsedIp,
      ipv6: null,
      hostname: envDomain || null,
      magicDns: parsedDns,
      tailscaleUrl,
      apiUrl: `${tailscaleUrl.replace(/\/$/, "")}/v1`,
      mode: "manual",
      source: "env",
      socketPath: null,
      binaryPath,
      backendState: "Running",
      statusPayload: syntheticPayload,
    };
  }

  // Layer 2: Live Unix socket & LocalAPI probing across NAS paths
  const activeSocket = await findActiveSocketWithStatus();
  if (activeSocket) {
    const { socketPath, status } = activeSocket;
    const backendState = typeof status.BackendState === "string" ? status.BackendState : "Running";
    const loggedIn = backendState === "Running";
    const self = asRecord(status.Self);
    const rootIps = Array.isArray(status.TailscaleIPs) ? (status.TailscaleIPs as string[]) : [];
    const selfIps = Array.isArray(self.TailscaleIPs) ? (self.TailscaleIPs as string[]) : [];
    const tailscaleIps = [...selfIps, ...rootIps];
    const ipv4 = tailscaleIps.find((ip) => isTailscaleIpv4(ip)) || null;
    const ipv6 = tailscaleIps.find((ip) => isTailscaleIpv6(ip)) || null;
    const rawDns = typeof self.DNSName === "string" ? self.DNSName : typeof status.DNSName === "string" ? status.DNSName : null;
    const magicDns = rawDns ? rawDns.replace(/\.$/, "") : null;
    const hostName = typeof self.HostName === "string" ? self.HostName : typeof status.HostName === "string" ? status.HostName : null;

    const tailscaleUrl = magicDns
      ? `https://${magicDns}`
      : ipv4
        ? `http://${ipv4}:${port}`
        : null;

    if (loggedIn && (ipv4 || magicDns)) {
      return {
        connected: true,
        loggedIn: true,
        daemonRunning: true,
        ip: ipv4,
        ipv6,
        hostname: hostName,
        magicDns,
        tailscaleUrl,
        apiUrl: tailscaleUrl ? `${tailscaleUrl.replace(/\/$/, "")}/v1` : null,
        mode: "daemon",
        source: "localapi-socket",
        socketPath,
        binaryPath,
        backendState,
        statusPayload: status,
      };
    }
  }

  // Layer 3: Host network interfaces (Host network mode on NAS / Bare metal)
  const interfaces = os.networkInterfaces();
  for (const [ifaceName, addrs] of Object.entries(interfaces)) {
    const isTsIface =
      ifaceName.toLowerCase().startsWith("tailscale") ||
      ifaceName.toLowerCase().startsWith("ts") ||
      ifaceName.toLowerCase().startsWith("utun");

    for (const addr of addrs ?? []) {
      if (addr.internal) continue;
      if (addr.family === "IPv4" && (isTailscaleIpv4(addr.address) || (isTsIface && addr.address.startsWith("100.")))) {
        const ip = addr.address;
        const tailscaleUrl = `http://${ip}:${port}`;
        const syntheticPayload: JsonRecord = {
          BackendState: "Running",
          Self: {
            DNSName: "",
            TailscaleIPs: [ip],
            HostName: os.hostname(),
          },
        };
        return {
          connected: true,
          loggedIn: true,
          daemonRunning: true,
          ip,
          ipv6: null,
          hostname: os.hostname(),
          magicDns: null,
          tailscaleUrl,
          apiUrl: `${tailscaleUrl}/v1`,
          mode: "external",
          source: "network-interface",
          socketPath: null,
          binaryPath,
          backendState: "Running",
          statusPayload: syntheticPayload,
        };
      }
    }
  }

  // Layer 4: CLI binary execution
  if (binaryPath) {
    const cliStatus = await readJsonCommand(binaryPath, await buildTailscaleArgs("status", "--json"));
    if (cliStatus) {
      const backendState = typeof cliStatus.BackendState === "string" ? cliStatus.BackendState : "Running";
      const loggedIn = backendState === "Running";
      const self = asRecord(cliStatus.Self);
      const rootIps = Array.isArray(cliStatus.TailscaleIPs) ? (cliStatus.TailscaleIPs as string[]) : [];
      const selfIps = Array.isArray(self.TailscaleIPs) ? (self.TailscaleIPs as string[]) : [];
      const tailscaleIps = [...selfIps, ...rootIps];
      const ipv4 = tailscaleIps.find((ip) => isTailscaleIpv4(ip)) || null;
      const ipv6 = tailscaleIps.find((ip) => isTailscaleIpv6(ip)) || null;
      const rawDns = typeof self.DNSName === "string" ? self.DNSName : null;
      const magicDns = rawDns ? rawDns.replace(/\.$/, "") : null;
      const hostName = typeof self.HostName === "string" ? self.HostName : null;

      const tailscaleUrl = magicDns
        ? `https://${magicDns}`
        : ipv4
          ? `http://${ipv4}:${port}`
          : null;

      if (loggedIn && (ipv4 || magicDns)) {
        return {
          connected: true,
          loggedIn: true,
          daemonRunning: true,
          ip: ipv4,
          ipv6,
          hostname: hostName,
          magicDns,
          tailscaleUrl,
          apiUrl: tailscaleUrl ? `${tailscaleUrl.replace(/\/$/, "")}/v1` : null,
          mode: "daemon",
          source: "cli",
          socketPath: await getActiveSocketPath(),
          binaryPath,
          backendState,
          statusPayload: cliStatus,
        };
      }
    }
  }

  // Layer 5: Passive Discovery via Incoming Request or Cached Session
  if (opts.requestHost) {
    recordPassiveTailscaleHost(opts.requestHost);
  }
  const candidateHost = opts.requestHost || (
    Date.now() - _lastPassiveTailscaleTimestamp < PASSIVE_TTL_MS
      ? _lastPassiveTailscaleHost
      : null
  );

  if (candidateHost && isTailscaleHost(candidateHost)) {
    const isHttps = candidateHost.endsWith(".ts.net") || candidateHost.includes(":443");
    const hasPort = candidateHost.includes(":");
    const fullHost = hasPort ? candidateHost : `${candidateHost}:${port}`;
    const cleanHostOnly = candidateHost.split(":")[0];
    const isIp = isTailscaleIpv4(cleanHostOnly);

    const tailscaleUrl = isHttps
      ? `https://${candidateHost}`
      : `http://${fullHost}`;

    return {
      connected: true,
      loggedIn: true,
      daemonRunning: true,
      ip: isIp ? cleanHostOnly : null,
      ipv6: isTailscaleIpv6(cleanHostOnly) ? cleanHostOnly : null,
      hostname: isIp ? null : cleanHostOnly,
      magicDns: isIp ? null : cleanHostOnly,
      tailscaleUrl,
      apiUrl: `${tailscaleUrl.replace(/\/$/, "")}/v1`,
      mode: "external",
      source: "passive-request",
      socketPath: null,
      binaryPath,
      backendState: "Running",
      statusPayload: null,
    };
  }

  const pidAlive = isProcessAlive((await readPidFile()) || null);
  return {
    connected: false,
    loggedIn: false,
    daemonRunning: pidAlive,
    ip: null,
    ipv6: null,
    hostname: null,
    magicDns: null,
    tailscaleUrl: null,
    apiUrl: null,
    mode: "daemon",
    source: "none",
    socketPath: null,
    binaryPath,
    backendState: "Stopped",
    statusPayload: null,
  };
}

async function getLiveStatusPayload(binaryPath: string | null) {
  const node = await detectTailscaleNode(binaryPath);
  return node.statusPayload;
}

async function getLiveFunnelPayload(binaryPath: string | null) {
  if (!binaryPath) return null;
  const funnelResult = await readJsonCommand(
    binaryPath,
    await buildTailscaleArgs("funnel", "status", "--json")
  );
  if (funnelResult) return funnelResult;
  // Fallback: older/some versions expose the same config via "serve status"
  return readJsonCommand(binaryPath, await buildTailscaleArgs("serve", "status", "--json"));
}

function isBackendRunning(payload: unknown) {
  return toNonEmptyString(asRecord(payload).BackendState) === "Running";
}

function isFunnelRunning(payload: unknown) {
  const allowFunnel = asRecord(payload).AllowFunnel;
  return Boolean(
    allowFunnel && typeof allowFunnel === "object" && Object.keys(allowFunnel).length > 0
  );
}

export function getTailscaleUrlFromStatusPayload(payload: unknown) {
  const root = asRecord(payload);
  const self = asRecord(root.Self);
  const dnsName = toNonEmptyString(self.DNSName) || toNonEmptyString(root.DNSName);
  if (dnsName) {
    const normalized = dnsName.replace(/\.$/, "");
    if (normalized) return `https://${normalized}`;
  }
  const selfIps = Array.isArray(self.TailscaleIPs) ? (self.TailscaleIPs as string[]) : [];
  const rootIps = Array.isArray(root.TailscaleIPs) ? (root.TailscaleIPs as string[]) : [];
  const allIps = [...selfIps, ...rootIps];
  const ipv4 = allIps.find((ip) => isTailscaleIpv4(ip));
  if (ipv4) {
    const { apiPort } = getRuntimePorts();
    return `http://${ipv4}:${apiPort}`;
  }
  return null;
}

export function extractTailscaleAuthUrl(text: string) {
  const match = text.match(/https:\/\/login\.tailscale\.com\/a\/[a-zA-Z0-9-]+/);
  return match ? match[0] : null;
}

export function extractTailscaleEnableUrl(text: string) {
  const match = text.match(/https:\/\/login\.tailscale\.com\/[^\s"']+/);
  return match ? match[0] : null;
}

export function extractTailscaleFunnelUrl(text: string) {
  const match = text.match(/https:\/\/[a-z0-9-]+\.[a-z0-9.-]+\.ts\.net\b[^\s"']*/i);
  if (!match) return null;
  return match[0].replace(/\/$/, "");
}

async function getDefaultHostname() {
  try {
    const machineId = await getConsistentMachineId();
    const normalized = `orbit-${machineId.slice(0, 8)}`.replace(/[^a-zA-Z0-9-]/g, "-");
    return normalized.toLowerCase();
  } catch {
    const hostname = os
      .hostname()
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    return hostname || "orbit";
  }
}

function getLastError(state: PersistedTailscaleState) {
  return typeof state.lastError === "string" && state.lastError.trim() ? state.lastError : null;
}

async function hasBrew() {
  if (getCurrentPlatform() !== "darwin") return false;
  try {
    await execFileAsync("which", ["brew"], {
      timeout: 3000,
      windowsHide: true,
      env: buildExecEnv(),
    });
    return true;
  } catch {
    return false;
  }
}

async function getLiveTunnelUrl(binaryPath: string | null) {
  const payload = await getLiveStatusPayload(binaryPath);
  return getTailscaleUrlFromStatusPayload(payload);
}

export async function getTailscaleCheckStatus(opts: {
  requestHost?: string | null;
  port?: number | string;
} = {}): Promise<TailscaleCheckStatus> {
  const resolution = await resolveBinary();
  const [state, node, funnelPayload, brewAvailable] = await Promise.all([
    readStateFile(),
    detectTailscaleNode(resolution.binaryPath, opts),
    getLiveFunnelPayload(resolution.binaryPath),
    hasBrew(),
  ]);

  const liveTunnelUrl = node.tailscaleUrl;
  const storedTunnelUrl = toNonEmptyString(state.tunnelUrl);
  const tunnelUrl = liveTunnelUrl || storedTunnelUrl;
  const loggedIn = node.loggedIn;
  const daemonRunning = node.daemonRunning || Boolean(node.statusPayload) || isProcessAlive((await readPidFile()) || null);
  const running = isFunnelRunning(funnelPayload) || Boolean(tunnelUrl);

  return {
    supported: isSupportedPlatform(),
    installed: Boolean(resolution.binaryPath || node.connected || node.daemonRunning || node.statusPayload),
    managedInstall: resolution.managedInstall,
    installSource: resolution.installSource,
    binaryPath: resolution.binaryPath,
    loggedIn,
    daemonRunning,
    running,
    tunnelUrl,
    apiUrl: getTailscaleApiUrl(tunnelUrl),
    platform: os.platform(),
    brewAvailable,
    lastError: getLastError(state),
    pid: await readPidFile(),
    connected: node.connected,
    ip: node.ip,
    ipv6: node.ipv6,
    hostname: node.hostname,
    magicDns: node.magicDns,
    tailscaleUrl: node.tailscaleUrl,
    publicUrl: node.magicDns ? `https://${node.magicDns}` : node.tailscaleUrl,
    mode: node.mode,
    source: node.source,
    socketPath: node.socketPath,
    backendState: node.backendState,
  };
}

export async function getTailscaleTunnelStatus(opts: {
  requestHost?: string | null;
  port?: number | string;
} = {}): Promise<TailscaleTunnelStatus> {
  const [check, settings] = await Promise.all([getTailscaleCheckStatus(opts), getSettings()]);
  const storedSettingUrl =
    typeof settings.tailscaleUrl === "string" && settings.tailscaleUrl.trim()
      ? settings.tailscaleUrl
      : null;
  const funnelUrl = check.tunnelUrl || storedSettingUrl;
  const funnelActive = (check.running && !check.connected) || (settings.tailscaleEnabled === true && check.loggedIn);
  const running = check.loggedIn && funnelActive && Boolean(funnelUrl);
  const enabled = settings.tailscaleEnabled === true && running;

  let phase: TailscaleTunnelPhase = "stopped";
  if (!check.supported) phase = "unsupported";
  else if (!check.installed) phase = "not_installed";
  else if (running) phase = "running";
  else if (check.daemonRunning && !check.loggedIn) phase = "needs_login";
  else if (check.lastError) phase = "error";

  const publicUrl = running ? funnelUrl : check.publicUrl;

  return {
    ...check,
    running,
    enabled,
    tunnelUrl: funnelUrl,
    publicUrl,
    apiUrl: getTailscaleApiUrl(funnelUrl || check.tailscaleUrl),
    phase,
  };
}

async function runSudoShell(command: string, password: string) {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error("Sudo password required");
  }
  await execFileWithPassword("sudo", ["-S", "sh", "-c", command], normalizedPassword);
}

export async function startTailscaleDaemon({
  sudoPassword,
}: {
  sudoPassword?: string;
} = {}) {
  const resolution = await resolveBinary();
  if (!resolution.binaryPath) {
    throw new Error("Tailscale is not installed");
  }

  // Invalidate socket cache so we re-probe the system socket
  invalidateSocketCache();

  // Check if the system daemon is already running (e.g. via systemd)
  // This is the most common case on servers where tailscale was installed via apt/brew
  if (isSystemDaemonAvailable()) {
    const systemStatus = await getLiveStatusPayload(resolution.binaryPath);
    if (systemStatus) {
      // System daemon is live — no need to start our own
      return { started: false, systemDaemon: true };
    }
  }

  // Check if our custom daemon is already running
  const existingStatus = await getLiveStatusPayload(resolution.binaryPath);
  if (existingStatus) {
    return { started: false };
  }

  if (getCurrentPlatform() === "win32") {
    try {
      await execFileAsync("net", ["start", "Tailscale"], {
        timeout: 10000,
        windowsHide: true,
        env: buildExecEnv(),
      });
    } catch {
      // Ignore service start errors and verify below.
    }

    await sleep(2500);
    if (!(await getLiveStatusPayload(resolution.binaryPath))) {
      throw new Error("Failed to start Tailscale service");
    }

    return { started: true };
  }

  const daemonBinary = await resolveDaemonBinary(resolution.binaryPath);
  if (!daemonBinary) {
    throw new Error("tailscaled binary not found");
  }

  const password = toNonEmptyString(sudoPassword) || getCachedPassword() || "";
  if (!password) {
    throw new Error("Sudo password required to start tailscaled");
  }

  setCachedPassword(password);
  await ensureTailscaleDir();

  const command = [
    `mkdir -p ${shellEscape(getTailscaleDir())}`,
    `nohup ${shellEscape(daemonBinary)} --socket=${shellEscape(getTailscaleSocketPath())} --statedir=${shellEscape(getTailscaleDir())} >> ${shellEscape(getLogFilePath())} 2>&1 & echo $! > ${shellEscape(getPidFilePath())}`,
  ].join(" && ");

  await runSudoShell(command, password);
  await sleep(3000);

  // Re-probe socket after starting
  invalidateSocketCache();

  if (!(await getLiveStatusPayload(resolution.binaryPath))) {
    throw new Error("tailscaled did not become ready");
  }

  const pid = await readPidFile();
  await updateStateFile({
    binaryPath: resolution.binaryPath,
    installSource: resolution.installSource,
    daemonPid: pid,
    lastError: null,
  });

  return { started: true };
}

export async function startTailscaleLogin({
  hostname,
  authKey,
}: {
  hostname?: string;
  authKey?: string;
} = {}): Promise<TailscaleLoginResult> {
  const resolvedAuthKey = toNonEmptyString(authKey) || toNonEmptyString(process.env.TAILSCALE_AUTHKEY);
  if (resolvedAuthKey) {
    process.env.TAILSCALE_AUTHKEY = resolvedAuthKey;
  }

  const resolution = await resolveBinary();
  if (!resolution.binaryPath) {
    if (resolvedAuthKey) {
      return { alreadyLoggedIn: true };
    }
    throw new Error("Tailscale is not installed");
  }

  const currentStatus = await getLiveStatusPayload(resolution.binaryPath);
  if (isBackendRunning(currentStatus)) {
    return { alreadyLoggedIn: true };
  }

  const resolvedHostname = toNonEmptyString(hostname) || (await getDefaultHostname());
  const spawnArgs = await buildTailscaleArgs(...tailscaleUpArgs(resolvedHostname, resolvedAuthKey ?? undefined));

  return new Promise((resolve, reject) => {
    const child = spawn(resolution.binaryPath as string, spawnArgs, {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildExecEnv(),
    });

    let settled = false;
    let output = "";

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback();
    };

    const handleData = (chunk: Buffer | string) => {
      output += chunk.toString();
      const authUrl = extractTailscaleAuthUrl(output);
      if (authUrl) {
        settle(() => resolve({ authUrl }));
      }
    };

    const timeoutId = setTimeout(() => {
      const authUrl = extractTailscaleAuthUrl(output);
      if (authUrl) {
        settle(() => resolve({ authUrl }));
        return;
      }
      settle(() => reject(new Error("Tailscale login timed out")));
    }, LOGIN_TIMEOUT_MS);

    child.stdout.on("data", handleData);
    child.stderr.on("data", handleData);
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", async (code) => {
      if (settled) return;

      const authUrl = extractTailscaleAuthUrl(output);
      if (authUrl) {
        settle(() => resolve({ authUrl }));
        return;
      }

      const latestStatus = await getLiveStatusPayload(resolution.binaryPath);
      if (code === 0 || isBackendRunning(latestStatus)) {
        settle(() => resolve({ alreadyLoggedIn: true }));
        return;
      }

      settle(() => reject(new Error(`tailscale up exited with code ${code ?? "unknown"}`)));
    });

    child.unref();
  });
}

async function resetTailscaleFunnel(binaryPath: string) {
  try {
    await execFileAsync(binaryPath, await buildTailscaleArgs("funnel", "--bg", "reset"), {
      timeout: 5000,
      windowsHide: true,
      env: buildExecEnv(),
    });
  } catch {
    // Ignore stale or missing funnel state.
  }
}

export async function startTailscaleFunnel(
  port = getRuntimePorts().apiPort
): Promise<TailscaleFunnelResult> {
  const resolution = await resolveBinary();
  if (!resolution.binaryPath) {
    throw new Error("Tailscale is not installed");
  }

  await resetTailscaleFunnel(resolution.binaryPath);

  const funnelArgs = await buildTailscaleArgs("funnel", "--bg", String(port));

  return new Promise((resolve, reject) => {
    const child = spawn(resolution.binaryPath as string, funnelArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildExecEnv(),
    });

    let settled = false;
    let output = "";

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback();
    };

    const finalizeFromOutput = async () => {
      const url =
        extractTailscaleFunnelUrl(output) || (await getLiveTunnelUrl(resolution.binaryPath));
      if (url) {
        settle(() => resolve({ tunnelUrl: url }));
        return;
      }

      const enableUrl = extractTailscaleEnableUrl(output);
      if (/funnel is not enabled/i.test(output) || enableUrl) {
        settle(() => resolve({ funnelNotEnabled: true, enableUrl }));
        return;
      }

      settle(() => reject(new Error(output.trim() || "Failed to start Tailscale Funnel")));
    };

    const handleData = (chunk: Buffer | string) => {
      output += chunk.toString();

      const tunnelUrl = extractTailscaleFunnelUrl(output);
      if (tunnelUrl) {
        settle(() => resolve({ tunnelUrl }));
        return;
      }

      const enableUrl = extractTailscaleEnableUrl(output);
      if (/funnel is not enabled/i.test(output) && enableUrl) {
        settle(() => resolve({ funnelNotEnabled: true, enableUrl }));
      }
    };

    const timeoutId = setTimeout(() => {
      void finalizeFromOutput();
    }, FUNNEL_TIMEOUT_MS);

    child.stdout.on("data", handleData);
    child.stderr.on("data", handleData);
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", () => {
      void finalizeFromOutput();
    });
  });
}

export async function stopTailscaleFunnel() {
  const resolution = await resolveBinary();
  if (!resolution.binaryPath) return;
  await resetTailscaleFunnel(resolution.binaryPath);
}

export async function stopTailscaleDaemon({
  sudoPassword,
}: {
  sudoPassword?: string;
} = {}) {
  const password = toNonEmptyString(sudoPassword) || getCachedPassword() || "";
  const pid = await readPidFile();

  if (pid && isProcessAlive(pid)) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore non-owned or stale processes.
    }
  }

  await sleep(1000);

  if (pid && isProcessAlive(pid) && password) {
    try {
      await runSudoShell(`kill ${Number(pid)}`, password);
    } catch {
      // Ignore fallback failures and keep trying generic process matches.
    }
  }

  if (getCurrentPlatform() !== "win32") {
    try {
      await execFileAsync("pkill", ["-x", "tailscaled"], {
        timeout: 3000,
        windowsHide: true,
        env: buildExecEnv(),
      });
    } catch {
      // Ignore when the daemon is not running or not owned by this user.
    }

    if (password) {
      try {
        await runSudoShell("pkill -x tailscaled", password);
      } catch {
        // Ignore final privileged shutdown failures.
      }
    }
  } else {
    try {
      await execFileAsync("net", ["stop", "Tailscale"], {
        timeout: 10000,
        windowsHide: true,
        env: buildExecEnv(),
      });
    } catch {
      // Ignore service stop failures on Windows.
    }
  }

  await clearPidFile();
  try {
    await fsPromises.unlink(getTailscaleSocketPath());
  } catch {
    // Ignore missing sockets.
  }
}

export async function enableTailscaleTunnel({
  sudoPassword,
  hostname,
  port,
}: {
  sudoPassword?: string;
  hostname?: string;
  port?: number;
} = {}): Promise<TailscaleEnableResult> {
  const normalizedPassword = toNonEmptyString(sudoPassword) || getCachedPassword() || "";
  if (normalizedPassword) {
    setCachedPassword(normalizedPassword);
  }

  const targetPort = port || getRuntimePorts().apiPort;

  try {
    await startTailscaleDaemon({ sudoPassword: normalizedPassword });

    const resolution = await resolveBinary();
    const currentStatus = await getLiveStatusPayload(resolution.binaryPath);

    if (!isBackendRunning(currentStatus)) {
      const loginResult = await startTailscaleLogin({ hostname });
      if ("authUrl" in loginResult) {
        await updateStateFile({ lastError: null });
        return {
          success: false,
          needsLogin: true,
          authUrl: loginResult.authUrl,
          status: await getTailscaleTunnelStatus(),
        };
      }
    }

    const funnelResult = await startTailscaleFunnel(targetPort);
    if ("funnelNotEnabled" in funnelResult) {
      await updateStateFile({ lastError: null });
      return {
        success: false,
        funnelNotEnabled: true,
        enableUrl: funnelResult.enableUrl,
        status: await getTailscaleTunnelStatus(),
      };
    }

    const tunnelUrl =
      funnelResult.tunnelUrl || (await getLiveTunnelUrl((await resolveBinary()).binaryPath));
    if (!tunnelUrl) {
      throw new Error("Failed to determine the Tailscale Funnel URL");
    }

    await updateSettings({
      tailscaleEnabled: true,
      tailscaleUrl: tunnelUrl,
    });
    await updateStateFile({
      tunnelUrl,
      lastError: null,
    });

    return {
      success: true,
      tunnelUrl,
      apiUrl: getTailscaleApiUrl(tunnelUrl),
      status: await getTailscaleTunnelStatus(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enable Tailscale Funnel";
    await updateStateFile({ lastError: message });
    throw error;
  }
}

export async function disableTailscaleTunnel({
  sudoPassword,
}: {
  sudoPassword?: string;
} = {}) {
  const normalizedPassword = toNonEmptyString(sudoPassword) || getCachedPassword() || "";
  if (normalizedPassword) {
    setCachedPassword(normalizedPassword);
  }

  try {
    await stopTailscaleFunnel();
    await stopTailscaleDaemon({ sudoPassword: normalizedPassword });
    await updateSettings({
      tailscaleEnabled: false,
      tailscaleUrl: "",
    });
    await updateStateFile({
      tunnelUrl: null,
      lastError: null,
    });
    return {
      success: true,
      status: await getTailscaleTunnelStatus(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable Tailscale Funnel";
    await updateStateFile({ lastError: message });
    throw error;
  }
}

function createStreamLogger(onProgress: ((message: string) => void) | undefined) {
  return (chunk: Buffer | string) => {
    const text = chunk.toString();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      onProgress?.(line);
    }
  };
}

async function installTailscaleMac(password: string, onProgress?: (message: string) => void) {
  if (await hasBrew()) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("brew", ["install", "tailscale"], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: buildExecEnv(),
      });
      const log = createStreamLogger(onProgress);
      child.stdout.on("data", log);
      child.stderr.on("data", log);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`brew install failed with code ${code}`));
      });
      child.on("error", reject);
    });
    return;
  }

  if (!password.trim()) {
    throw new Error("Sudo password required to install Tailscale");
  }

  const pkgUrl = "https://pkgs.tailscale.com/stable/tailscale-latest.pkg";
  const pkgPath = path.join(os.tmpdir(), "tailscale.pkg");

  await new Promise<void>((resolve, reject) => {
    const child = spawn("curl", ["-fL", "--progress-bar", pkgUrl, "-o", pkgPath], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildExecEnv(),
    });
    child.stderr.on("data", createStreamLogger(onProgress));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Failed to download the Tailscale package"));
    });
    child.on("error", reject);
  });

  await new Promise<void>((resolve, reject) => {
    const child = spawn("sudo", ["-S", "installer", "-pkg", pkgPath, "-target", "/"], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: buildExecEnv(),
    });
    const log = createStreamLogger(onProgress);
    let stderr = "";
    child.stdin.write(`${password}\n`);
    child.stdin.end();
    child.stdout.on("data", log);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      log(chunk);
    });
    child.on("close", async (code) => {
      try {
        await fsPromises.unlink(pkgPath);
      } catch {
        // Ignore cleanup errors.
      }
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `installer exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function installTailscaleLinux(password: string, onProgress?: (message: string) => void) {
  if (!password.trim()) {
    throw new Error("Sudo password required to install Tailscale");
  }

  await new Promise<void>((resolve, reject) => {
    const curlChild = spawn("curl", ["-fsSL", "https://tailscale.com/install.sh"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildExecEnv(),
    });

    let scriptContent = "";
    let downloadError = "";

    curlChild.stdout.on("data", (chunk) => {
      scriptContent += chunk.toString();
    });
    curlChild.stderr.on("data", (chunk) => {
      downloadError += chunk.toString();
      createStreamLogger(onProgress)(chunk);
    });

    curlChild.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(downloadError.trim() || "Failed to download the Tailscale installer"));
        return;
      }

      const child = spawn("sudo", ["-S", "sh"], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: buildExecEnv(),
      });

      let stderr = "";
      const log = createStreamLogger(onProgress);
      child.stdin.write(`${password}\n`);
      child.stdin.write(scriptContent);
      child.stdin.end();
      child.stdout.on("data", log);
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
        log(chunk);
      });
      child.on("close", (installCode) => {
        if (installCode === 0) resolve();
        else reject(new Error(stderr.trim() || `install.sh exited with code ${installCode}`));
      });
      child.on("error", reject);
    });

    curlChild.on("error", reject);
  });
}

export function buildWindowsTailscaleInstallCommand(msiPath: string): string {
  const escapedMsiPath = msiPath.replace(/'/g, "''");
  return `Start-Process msiexec -ArgumentList '/i','${escapedMsiPath}','TS_NOLAUNCH=true','/quiet','/norestart' -Verb RunAs -Wait`;
}

async function installTailscaleWindows(onProgress?: (message: string) => void) {
  const msiUrl = "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi";
  const msiPath = path.join(os.tmpdir(), "tailscale-setup.msi");

  await new Promise<void>((resolve, reject) => {
    const child = spawn("curl.exe", ["-L", "-#", "-o", msiPath, msiUrl], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildExecEnv(),
    });
    child.stderr.on("data", createStreamLogger(onProgress));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Failed to download the Tailscale installer"));
    });
    child.on("error", reject);
  });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", buildWindowsTailscaleInstallCommand(msiPath)],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: buildExecEnv(),
      }
    );
    const log = createStreamLogger(onProgress);
    child.stdout.on("data", log);
    child.stderr.on("data", log);
    child.on("close", async (code) => {
      try {
        await fsPromises.unlink(msiPath);
      } catch {
        // Ignore cleanup errors.
      }
      if (code === 0) resolve();
      else reject(new Error(`msiexec exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function installTailscale({
  sudoPassword,
  onProgress,
}: {
  sudoPassword?: string;
  onProgress?: (message: string) => void;
} = {}) {
  if (!isSupportedPlatform()) {
    throw new Error(`Unsupported platform for Tailscale install: ${os.platform()}`);
  }

  const password = toNonEmptyString(sudoPassword) || getCachedPassword() || "";
  if (password) {
    setCachedPassword(password);
  }

  onProgress?.("Checking existing Tailscale installation...");
  const existingBinary = await resolveBinary();
  if (existingBinary.binaryPath) {
    onProgress?.("Tailscale is already installed.");
  } else if (getCurrentPlatform() === "win32") {
    onProgress?.("Downloading and installing Tailscale for Windows...");
    await installTailscaleWindows(onProgress);
  } else if (getCurrentPlatform() === "darwin") {
    onProgress?.("Installing Tailscale on macOS...");
    await installTailscaleMac(password, onProgress);
  } else if (getCurrentPlatform() === "linux") {
    onProgress?.("Installing Tailscale on Linux...");
    await installTailscaleLinux(password, onProgress);
  }

  try {
    onProgress?.("Ensuring the Tailscale daemon is available...");
    await startTailscaleDaemon({ sudoPassword: password });
  } catch (error) {
    onProgress?.(
      `Install completed, but the daemon still needs manual attention: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const status = await getTailscaleTunnelStatus();
  await updateStateFile({
    binaryPath: status.binaryPath,
    installSource: status.installSource,
    lastError: null,
    installedAt: new Date().toISOString(),
  });

  return status;
}
