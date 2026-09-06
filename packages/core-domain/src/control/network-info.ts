import os from "node:os";
import { getRuntimePorts } from "../lib/runtime/ports.ts";
import {
  getTailscaleTunnelStatus,
  isTailscaleIpv4,
  isTailscaleIpv6,
} from "../lib/tailscaleTunnel.ts";

export interface NetworkInfo {
  localUrl: string;
  lanUrls: string[];
  tailscaleUrl: string | null;
  tailscaleIpUrl: string | null;
}

/** Resolve advertised API endpoints; the caller supplies the transport Host header. */
export async function resolveNetworkInfo(requestHost?: string | null): Promise<NetworkInfo> {
  const { apiPort } = getRuntimePorts();
  const localUrl = `http://localhost:${apiPort}/v1`;
  const lanUrls: string[] = [];
  let tailscaleIpUrl: string | null = null;
  let tailscaleUrl: string | null = null;

  for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      const normalizedName = interfaceName.toLowerCase();
      const tailscale = normalizedName.startsWith("tailscale")
        || normalizedName.startsWith("ts")
        || normalizedName.startsWith("utun")
        || isTailscaleIpv4(address.address)
        || address.address.startsWith("100.");
      if (tailscale) tailscaleIpUrl = `http://${address.address}:${apiPort}/v1`;
      else lanUrls.push(`http://${address.address}:${apiPort}/v1`);
    }
  }

  try {
    const status = await getTailscaleTunnelStatus();
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
        tailscaleIpUrl = `http://${normalizedHost}:${apiPort}/v1`;
      }
    }
  }

  return { localUrl, lanUrls, tailscaleUrl: tailscaleUrl || tailscaleIpUrl, tailscaleIpUrl };
}
