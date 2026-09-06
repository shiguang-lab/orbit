import os from "node:os";

interface TailscaleStatus {
  running?: boolean;
  connected?: boolean;
  tunnelUrl?: string | null;
  apiUrl?: string | null;
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
      if (tailscale) tailscaleIpUrl = `http://${address.address}:${edgePort}/v1`;
      else lanUrls.push(`http://${address.address}:${edgePort}/v1`);
    }
  }

  try {
    const status = await (dependencies.getTailscaleStatus ?? (async () => ({})))() as TailscaleStatus;
    if (status.running || status.connected || status.tunnelUrl) {
      if (status.tunnelUrl) {
        tailscaleUrl = status.apiUrl || `${status.tunnelUrl.replace(/\/$/, "")}/v1`;
      }
      const tunnelHost = status.tunnelUrl?.replace(/^https?:\/\//, "").split(":")[0];
      if (!tailscaleIpUrl && status.tunnelUrl && tunnelHost && isTailscaleIpv4(tunnelHost)) {
        tailscaleIpUrl = `${status.tunnelUrl.replace(/\/$/, "")}/v1`;
      }
    }
  } catch {
    // Network discovery remains useful when the optional tunnel service is unavailable.
  }

  if (requestHost) {
    const normalizedHost = requestHost.trim().toLowerCase().split(":")[0]?.replace(/^\[|\]$/g, "") ?? "";
    if (
      normalizedHost.endsWith(".ts.net")
      || normalizedHost.endsWith(".tailscale.net")
      || isTailscaleIpv4(normalizedHost)
      || isTailscaleIpv6(normalizedHost)
    ) {
      if (!tailscaleUrl) tailscaleUrl = `http://${requestHost.trim().replace(/\/$/, "")}/v1`;
      if (isTailscaleIpv4(normalizedHost) && !tailscaleIpUrl) {
        tailscaleIpUrl = `http://${normalizedHost}:${edgePort}/v1`;
      }
    }
  }

  return { localUrl, lanUrls, tailscaleUrl: tailscaleUrl || tailscaleIpUrl, tailscaleIpUrl };
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
