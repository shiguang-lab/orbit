import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface TailscaleDetectionResult {
  connected: boolean;
  running: boolean;
  ip: string | null;
  ipv6: string | null;
  hostname: string | null;
  magicDns: string | null;
  tailscaleUrl: string | null;
  apiUrl: string | null;
  source: "localapi-socket" | "cli" | "network-interface" | "passive-request" | "env" | "none";
  socketPath?: string | null;
  binaryPath?: string | null;
  backendState?: string | null;
}

// Memory cache for passive request discovery (e.g. Docker bridge mode accessed via Tailscale IP/domain)
let _lastPassiveTailscaleHost: string | null = null;
let _lastPassiveTailscaleTimestamp = 0;
const PASSIVE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Known Tailscale Unix socket paths across Linux, macOS, Synology DSM, QNAP, and Docker containers
 */
const CANDIDATE_SOCKET_PATHS = [
  process.env.TAILSCALE_SOCKET,
  "/var/run/tailscale/tailscaled.sock",
  "/run/tailscale/tailscaled.sock",
  "/host/var/run/tailscale/tailscaled.sock",
  "/host/run/tailscale/tailscaled.sock",
  "/var/run/tailscaled.sock",
  // Synology DSM 6 / 7 package paths
  "/var/packages/Tailscale/var/tailscaled.sock",
  "/var/packages/Tailscale/etc/tailscaled.sock",
  "/volume1/@appdata/Tailscale/tailscaled.sock",
  "/volume2/@appdata/Tailscale/tailscaled.sock",
  // QNAP QPKG paths
  "/share/CACHEDEV1_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  "/share/MD0_DATA/.qpkg/Tailscale/var/tailscaled.sock",
  // macOS user sockets
  path.join(os.homedir(), ".tailscale", "tailscaled.sock"),
  path.join(os.homedir(), "Library/Containers/io.tailscale.ipn.macsys/Data/tailscaled.sock"),
].filter((p): p is string => Boolean(p && typeof p === "string"));

/**
 * Candidate CLI binary paths
 */
const CANDIDATE_CLI_PATHS = [
  process.env.TAILSCALE_BIN,
  "/var/packages/Tailscale/target/bin/tailscale", // Synology
  "/usr/local/bin/tailscale",
  "/usr/bin/tailscale",
  "/opt/homebrew/bin/tailscale",
  "/share/CACHEDEV1_DATA/.qpkg/Tailscale/bin/tailscale", // QNAP
  "C:\\Program Files\\Tailscale\\tailscale.exe",
].filter((p): p is string => Boolean(p && typeof p === "string"));

/**
 * Check if an IPv4 address is in the Tailscale CGNAT subnet (100.64.0.0/10)
 */
export function isTailscaleIpv4(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [first, second] = parts;
  return first === 100 && second >= 64 && second <= 127;
}

/**
 * Check if an IPv6 address is in the Tailscale ULA subnet (fd7a:115c:a1e0::/48)
 */
export function isTailscaleIpv6(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const normalized = ip.trim().toLowerCase();
  return normalized.startsWith("fd7a:115c:a1e0:") || normalized.startsWith("fd7a:115c:a1e0::");
}

/**
 * Check if a hostname is a Tailscale MagicDNS or CGNAT IP address
 */
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

/**
 * Record passive host from incoming request
 */
export function recordPassiveTailscaleHost(hostHeader?: string | string[]): void {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (!raw) return;
  const host = raw.trim();
  if (isTailscaleHost(host)) {
    _lastPassiveTailscaleHost = host;
    _lastPassiveTailscaleTimestamp = Date.now();
  }
}

/**
 * Query Tailscale LocalAPI via Unix Domain Socket
 */
async function queryTailscaleLocalApi(socketPath: string): Promise<Record<string, unknown> | null> {
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
                resolve(JSON.parse(data));
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

/**
 * Probe available live Tailscale socket
 */
export async function findActiveSocket(): Promise<{ socketPath: string; status: Record<string, unknown> } | null> {
  for (const socketPath of CANDIDATE_SOCKET_PATHS) {
    try {
      if (fs.existsSync(socketPath)) {
        const status = await queryTailscaleLocalApi(socketPath);
        if (status) {
          return { socketPath, status };
        }
      }
    } catch {
      // Continue searching
    }
  }
  return null;
}

/**
 * Probe CLI binary
 */
export async function findCliBinary(): Promise<string | null> {
  for (const binPath of CANDIDATE_CLI_PATHS) {
    try {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    } catch {
      // Continue
    }
  }
  try {
    const lookup = os.platform() === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(lookup, ["tailscale"], { timeout: 2000 });
    const line = stdout.split(/\r?\n/)[0]?.trim();
    if (line && fs.existsSync(line)) return line;
  } catch {
    // Not in PATH
  }
  return null;
}

/**
 * Extract Tailscale IP from network interfaces
 */
export function getTailscaleFromInterfaces(): { ip: string | null; ipv6: string | null } {
  const interfaces = os.networkInterfaces();
  let ipv4: string | null = null;
  let ipv6: string | null = null;

  for (const [ifaceName, addrs] of Object.entries(interfaces)) {
    const nameLower = ifaceName.toLowerCase();
    const isTailscaleIface =
      nameLower.startsWith("tailscale") ||
      nameLower.startsWith("ts") ||
      nameLower.startsWith("utun");

    for (const addr of addrs ?? []) {
      if (addr.internal) continue;
      if (addr.family === "IPv4") {
        if (isTailscaleIpv4(addr.address) || (isTailscaleIface && addr.address.startsWith("100."))) {
          if (!ipv4) ipv4 = addr.address;
        }
      } else if (addr.family === "IPv6") {
        if (isTailscaleIpv6(addr.address)) {
          if (!ipv6) ipv6 = addr.address;
        }
      }
    }
  }

  return { ip: ipv4, ipv6 };
}

/**
 * Resolve comprehensive Tailscale discovery across local and container scenarios
 */
export async function detectTailscale(opts: {
  port?: number | string;
  incomingHost?: string;
} = {}): Promise<TailscaleDetectionResult> {
  const port = opts.port || process.env.EDGE_GATEWAY_PORT || process.env.PORT || "8787";

  // Layer 1: Check explicit container configuration
  const envUrl = process.env.TAILSCALE_URL?.trim();
  const envIp = process.env.TAILSCALE_IP?.trim();
  const envDomain = (process.env.TAILSCALE_HOSTNAME || process.env.TS_DOMAIN || process.env.MAGIC_DNS)?.trim();

  if (envUrl || envIp || envDomain) {
    const ip = envIp || (envUrl && envUrl.includes("100.") ? new URL(envUrl).hostname : null);
    const magicDns = envDomain || (envUrl && !envUrl.includes("100.") ? new URL(envUrl).hostname : null);
    const tailscaleUrl = envUrl || (magicDns ? `https://${magicDns}` : `http://${ip}:${port}`);
    return {
      connected: true,
      running: true,
      ip: ip || null,
      ipv6: null,
      hostname: envDomain || null,
      magicDns: magicDns || null,
      tailscaleUrl,
      apiUrl: `${tailscaleUrl.replace(/\/$/, "")}/v1`,
      source: "env",
      backendState: "Running",
    };
  }

  // Layer 2: Probe live Tailscale Unix domain socket and LocalAPI (Synology SPK, QNAP QPKG, Docker mount)
  const activeSocket = await findActiveSocket();
  if (activeSocket) {
    const { socketPath, status } = activeSocket;
    const backendState = typeof status.BackendState === "string" ? status.BackendState : "Running";
    const self = (status.Self && typeof status.Self === "object" ? status.Self : {}) as Record<string, unknown>;
    const tailscaleIps = Array.isArray(self.TailscaleIPs) ? (self.TailscaleIPs as string[]) : [];
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

    if (backendState === "Running" && (ipv4 || magicDns)) {
      return {
        connected: true,
        running: true,
        ip: ipv4,
        ipv6,
        hostname: hostName,
        magicDns,
        tailscaleUrl,
        apiUrl: tailscaleUrl ? `${tailscaleUrl.replace(/\/$/, "")}/v1` : null,
        source: "localapi-socket",
        socketPath,
        backendState,
      };
    }
  }

  // Layer 3: Host network interfaces (host network mode / bare metal)
  const ifaceResult = getTailscaleFromInterfaces();
  if (ifaceResult.ip || ifaceResult.ipv6) {
    const ip = ifaceResult.ip;
    const tailscaleUrl = ip ? `http://${ip}:${port}` : null;
    return {
      connected: true,
      running: true,
      ip: ifaceResult.ip,
      ipv6: ifaceResult.ipv6,
      hostname: os.hostname(),
      magicDns: null,
      tailscaleUrl,
      apiUrl: tailscaleUrl ? `${tailscaleUrl}/v1` : null,
      source: "network-interface",
      backendState: "Running",
    };
  }

  // Layer 4: CLI binary execution if socket probing didn't directly yield status
  const cliBinary = await findCliBinary();
  if (cliBinary) {
    try {
      const { stdout } = await execFileAsync(cliBinary, ["status", "--json"], { timeout: 3000 });
      const status = JSON.parse(stdout) as Record<string, unknown>;
      const backendState = typeof status.BackendState === "string" ? status.BackendState : "Running";
      const self = (status.Self && typeof status.Self === "object" ? status.Self : {}) as Record<string, unknown>;
      const tailscaleIps = Array.isArray(self.TailscaleIPs) ? (self.TailscaleIPs as string[]) : [];
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

      if (backendState === "Running" && (ipv4 || magicDns)) {
        return {
          connected: true,
          running: true,
          ip: ipv4,
          ipv6,
          hostname: hostName,
          magicDns,
          tailscaleUrl,
          apiUrl: tailscaleUrl ? `${tailscaleUrl.replace(/\/$/, "")}/v1` : null,
          source: "cli",
          binaryPath: cliBinary,
          backendState,
        };
      }
    } catch {
      // Ignore CLI execution error
    }
  }

  // Layer 5: Passive Discovery via Incoming Request or Cached Session
  const candidateHost = opts.incomingHost || (
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
      running: true,
      ip: isIp ? cleanHostOnly : null,
      ipv6: isTailscaleIpv6(cleanHostOnly) ? cleanHostOnly : null,
      hostname: isIp ? null : cleanHostOnly,
      magicDns: isIp ? null : cleanHostOnly,
      tailscaleUrl,
      apiUrl: `${tailscaleUrl.replace(/\/$/, "")}/v1`,
      source: "passive-request",
      backendState: "Running",
    };
  }

  return {
    connected: false,
    running: false,
    ip: null,
    ipv6: null,
    hostname: null,
    magicDns: null,
    tailscaleUrl: null,
    apiUrl: null,
    source: "none",
    backendState: "Stopped",
  };
}
