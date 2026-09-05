import os from "os";
import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../../shared/utils/apiAuth.ts";
import { getRuntimePorts } from "../../../../lib/runtime/ports.ts";
import { getTailscaleTunnelStatus, isTailscaleIpv4, isTailscaleIpv6 } from "../../../../lib/tailscaleTunnel.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiPort } = getRuntimePorts();
  const interfaces = os.networkInterfaces();
  const localUrl = `http://localhost:${apiPort}/v1`;
  const lanUrls: string[] = [];
  let tailscaleIpUrl: string | null = null;
  let tailscaleUrl: string | null = null;

  for (const [ifaceName, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      const isTailscale =
        ifaceName.toLowerCase().startsWith("tailscale") ||
        ifaceName.toLowerCase().startsWith("ts") ||
        ifaceName.toLowerCase().startsWith("utun") ||
        isTailscaleIpv4(addr.address) ||
        addr.address.startsWith("100.");
      if (isTailscale) {
        tailscaleIpUrl = `http://${addr.address}:${apiPort}/v1`;
      } else {
        lanUrls.push(`http://${addr.address}:${apiPort}/v1`);
      }
    }
  }

  try {
    const tsStatus = await getTailscaleTunnelStatus();
    if (tsStatus.running || tsStatus.connected || tsStatus.tunnelUrl) {
      if (tsStatus.tunnelUrl) {
        tailscaleUrl = tsStatus.apiUrl || `${tsStatus.tunnelUrl.replace(/\/$/, "")}/v1`;
      }
      if (!tailscaleIpUrl && tsStatus.tunnelUrl && isTailscaleIpv4(tsStatus.tunnelUrl.replace(/^https?:\/\//, "").split(":")[0])) {
        tailscaleIpUrl = `${tsStatus.tunnelUrl.replace(/\/$/, "")}/v1`;
      }
    }
  } catch {
    // Ignore error
  }

  // Passive detection from incoming request headers
  const reqHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (reqHost) {
    const cleanHost = reqHost.trim().toLowerCase().split(":")[0].replace(/^\[|\]$/g, "");
    if (cleanHost.endsWith(".ts.net") || cleanHost.endsWith(".tailscale.net") || isTailscaleIpv4(cleanHost) || isTailscaleIpv6(cleanHost)) {
      if (!tailscaleUrl) {
        tailscaleUrl = `http://${reqHost.trim().replace(/\/$/, "")}/v1`;
      }
      if (isTailscaleIpv4(cleanHost) && !tailscaleIpUrl) {
        tailscaleIpUrl = `http://${cleanHost}:${apiPort}/v1`;
      }
    }
  }

  return NextResponse.json({
    localUrl,
    lanUrls,
    tailscaleUrl: tailscaleUrl || tailscaleIpUrl,
    tailscaleIpUrl,
  });
}
