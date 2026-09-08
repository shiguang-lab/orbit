import os from "node:os";

interface TailscaleStatus {
  running?: boolean;
  connected?: boolean;
  tunnelUrl?: string | null;
  apiUrl?: string | null;
  ip?: string | null;
  magicDns?: string | null;
  hostname?: string | null;
  tailscaleUrl?: string | null;
  source?: string | null;
}

export interface NetworkInfoDependencies {
  networkInterfaces?: typeof os.networkInterfaces;
  getTailscaleStatus?: () => Promise<unknown>;
  env?: NodeJS.ProcessEnv;
}

export interface NetworkInfo {
  localUrl: string;
  lanUrls: string[];
  tailscaleUrl: string | null;
  tailscaleIpUrl: string | null;
  port: number;
  tailscaleDetails: {
    connected: boolean;
    ip: string | null;
    magicDns: string | null;
    hostname: string | null;
    source: string;
  };
}

/** Resolve advertised API endpoints; the caller supplies the transport Host header. */
export async function resolveNetworkInfo(
  requestHost?: string | null,
  dependencies: NetworkInfoDependencies = {},
): Promise<NetworkInfo> {
  const env = dependencies.env ?? process.env;
  const configuredPort = Number.parseInt(env.EDGE_GATEWAY_PORT ?? env.PORT ?? "8787", 10);
  const edgePort = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535
    ? configuredPort
    : 8787;
  const localUrl = `http://localhost:${edgePort}/v1`;
  const lanUrls: string[] = [];
  let tailscaleIpUrl: string | null = null;
  let tailscaleUrl: string | null = null;
  let tailscaleConnected = false;
  let tailscaleIp: string | null = null;
  let tailscaleMagicDns: string | null = null;
  let tailscaleHostname: string | null = null;
  let tailscaleSource = "none";

  // Layer 1: Check environment variables (Explicit NAS Docker configuration)
  const envUrl = env.TAILSCALE_URL?.trim();
  const envIp = env.TAILSCALE_IP?.trim();
  const envHostname = env.TAILSCALE_HOSTNAME?.trim();
  const envDomain = (env.TS_DOMAIN || env.MAGIC_DNS || envHostname)?.trim();
  if (envUrl || envIp || envDomain) {
    tailscaleConnected = true;
    tailscaleSource = "env";
    if (envIp) {
      tailscaleIp = envIp;
      tailscaleIpUrl = `http://${envIp}:${edgePort}/v1`;
    }
    if (envDomain) {
      tailscaleMagicDns = envDomain.includes(".") ? envDomain : null;
      tailscaleHostname = envHostname || envDomain;
      if (tailscaleMagicDns) {
        tailscaleUrl = `https://${tailscaleMagicDns}/v1`;
      }
    }
    if (envUrl) {
      tailscaleUrl = `${envUrl.replace(/\/$/, "")}/v1`;
      if (!tailscaleIp) {
        try {
          const parsed = new URL(envUrl).hostname;
          if (isTailscaleIpv4(parsed)) {
            tailscaleIp = parsed;
            tailscaleIpUrl = `http://${parsed}:${edgePort}/v1`;
          } else if (!tailscaleMagicDns && parsed.includes(".")) {
            tailscaleMagicDns = parsed;
          }
        } catch {}
      }
    }
  }

  // Layer 2: Host Network interfaces
  for (const [interfaceName, addresses] of Object.entries(
    (dependencies.networkInterfaces ?? os.networkInterfaces)(),
  )) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      const normalizedName = interfaceName.toLowerCase();
      const tailscale = normalizedName.startsWith("tailscale")
        || normalizedName.startsWith("ts")
        || normalizedName.startsWith("utun")
        || isTailscaleIpv4(address.address)
        || address.address.startsWith("100.");
      if (tailscale) {
        tailscaleConnected = true;
        tailscaleIp = address.address;
        tailscaleIpUrl = `http://${address.address}:${edgePort}/v1`;
        if (tailscaleSource === "none") tailscaleSource = "network-interface";
      } else {
        lanUrls.push(`http://${address.address}:${edgePort}/v1`);
      }
    }
  }

  // Layer 3: Tailscale Tunnel status from Edge Gateway
  try {
    const status = await (dependencies.getTailscaleStatus ?? (async () => ({})))() as TailscaleStatus;
    if (status.running || status.connected || status.tunnelUrl || status.ip || status.magicDns || status.tailscaleUrl) {
      if (status.connected) tailscaleConnected = true;
      if (status.ip) {
        tailscaleIp = status.ip;
        tailscaleIpUrl = `http://${status.ip}:${edgePort}/v1`;
      }
      if (status.magicDns) {
        tailscaleMagicDns = status.magicDns;
        tailscaleUrl = `https://${status.magicDns}/v1`;
      }
      if (status.hostname && !tailscaleHostname) {
        tailscaleHostname = status.hostname;
      }
      if (status.tailscaleUrl && !tailscaleUrl) {
        tailscaleUrl = `${status.tailscaleUrl.replace(/\/$/, "")}/v1`;
      }
      if (status.tunnelUrl) {
        const tunnelTarget = status.apiUrl || `${status.tunnelUrl.replace(/\/$/, "")}/v1`;
        if (!tailscaleUrl) tailscaleUrl = tunnelTarget;
      }
      if (status.source) {
        tailscaleSource = status.source;
      }
    }
  } catch {
    // Network discovery remains useful when the optional tunnel service is unavailable.
  }

  // Layer 4: Request Host (Passive detection)
  if (requestHost) {
    const normalizedHost = requestHost.trim().toLowerCase().split(":")[0]?.replace(/^\[|\]$/g, "") ?? "";
    if (
      normalizedHost.endsWith(".ts.net")
      || normalizedHost.endsWith(".tailscale.net")
      || isTailscaleIpv4(normalizedHost)
      || isTailscaleIpv6(normalizedHost)
    ) {
      tailscaleConnected = true;
      if (!tailscaleUrl) tailscaleUrl = `http://${requestHost.trim().replace(/\/$/, "")}/v1`;
      if (isTailscaleIpv4(normalizedHost)) {
        tailscaleIp = normalizedHost;
        if (!tailscaleIpUrl) {
          tailscaleIpUrl = `http://${normalizedHost}:${edgePort}/v1`;
        }
      } else if (!tailscaleMagicDns && normalizedHost.endsWith(".ts.net")) {
        tailscaleMagicDns = normalizedHost;
      }
      if (tailscaleSource === "none") tailscaleSource = "passive-request";
    }
  }

  const effectiveTailscaleUrl = tailscaleUrl || tailscaleIpUrl;

  return {
    localUrl,
    lanUrls,
    tailscaleUrl: effectiveTailscaleUrl,
    tailscaleIpUrl,
    port: edgePort,
    tailscaleDetails: {
      connected: tailscaleConnected,
      ip: tailscaleIp,
      magicDns: tailscaleMagicDns,
      hostname: tailscaleHostname,
      source: tailscaleSource,
    },
  };
}

function isTailscaleIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  return octets.length === 4
    && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    && octets[0] === 100
    && octets[1] >= 64
    && octets[1] <= 127;
}

function isTailscaleIpv6(value: string): boolean {
  return value.toLowerCase().startsWith("fd7a:115c:a1e0:");
}
