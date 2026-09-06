import { Injectable } from "@nestjs/common";
import {
  disableTailscaleTunnel,
  enableTailscaleTunnel,
  getCloudflaredTunnelStatus,
  getNgrokTunnelStatus,
  getTailscaleCheckStatus,
  getTailscaleTunnelStatus,
  installTailscale,
  startCloudflaredTunnel,
  startNgrokTunnel,
  startTailscaleDaemon,
  startTailscaleLogin,
  stopCloudflaredTunnel,
  stopNgrokTunnel,
} from "@shiguang-gateway/core-domain/control/tunnels";

@Injectable()
export class TunnelsService {
  cloudflaredStatus() {
    return getCloudflaredTunnelStatus();
  }

  cloudflaredAction(action: "enable" | "disable") {
    return action === "enable" ? startCloudflaredTunnel() : stopCloudflaredTunnel();
  }

  ngrokStatus() {
    return getNgrokTunnelStatus();
  }

  ngrokAction(action: "enable" | "disable", authToken?: string) {
    return action === "enable" ? startNgrokTunnel(authToken) : stopNgrokTunnel();
  }

  tailscaleStatus() {
    return getTailscaleTunnelStatus();
  }

  tailscaleCheck() {
    return getTailscaleCheckStatus();
  }

  tailscaleEnable(input: { sudoPassword?: string; hostname?: string; port?: number }) {
    return enableTailscaleTunnel(input);
  }

  tailscaleDisable(input: { sudoPassword?: string }) {
    return disableTailscaleTunnel(input);
  }

  tailscaleLogin(input: { hostname?: string }) {
    return startTailscaleLogin(input);
  }

  tailscaleDaemon(input: { sudoPassword?: string }) {
    return startTailscaleDaemon(input);
  }

  tailscaleInstall(input: { sudoPassword?: string }, onProgress: (message: string) => void) {
    return installTailscale({ ...input, onProgress });
  }
}
