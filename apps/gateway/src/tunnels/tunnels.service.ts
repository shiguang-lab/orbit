import { Injectable } from "@nestjs/common";
import type { TunnelCommand } from "@orbit/contracts/tunnel-command";
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
} from "@orbit/core/edge/tunnels";

@Injectable()
export class TunnelsService {
  execute(command: Exclude<TunnelCommand, { command: "tailscale.install" }>): Promise<unknown> {
    switch (command.command) {
      case "cloudflared.status": return getCloudflaredTunnelStatus();
      case "cloudflared.enable": return startCloudflaredTunnel();
      case "cloudflared.disable": return stopCloudflaredTunnel();
      case "ngrok.status": return getNgrokTunnelStatus();
      case "ngrok.enable": return startNgrokTunnel(command.authToken);
      case "ngrok.disable": return stopNgrokTunnel();
      case "tailscale.status": return getTailscaleTunnelStatus({ requestHost: command.requestHost });
      case "tailscale.check": return getTailscaleCheckStatus({ requestHost: command.requestHost });
      case "tailscale.enable": return enableTailscaleTunnel(command);
      case "tailscale.disable": return disableTailscaleTunnel(command);
      case "tailscale.login": return startTailscaleLogin(command);
      case "tailscale.start-daemon": return startTailscaleDaemon(command);
    }
  }

  install(command: Extract<TunnelCommand, { command: "tailscale.install" }>, onProgress: (message: string) => void) {
    return installTailscale({ sudoPassword: command.sudoPassword, onProgress });
  }
}
