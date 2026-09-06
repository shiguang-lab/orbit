import { Injectable } from "@nestjs/common";
import type { TunnelCommand, TunnelCommandPayload } from "@shiguang-gateway/contracts/tunnel-command";
import { getInternalServiceAuthHeaders } from "@shiguang-gateway/core-domain/edge/internal-service-auth";

function edgeGatewayBaseUrl(): string {
  const configured = process.env.EDGE_GATEWAY_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1").trim();
  const reachableHost = host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;
  return `http://${reachableHost}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
}

function commandUrl(): string {
  return `${edgeGatewayBaseUrl()}/api/internal/tunnels/command`;
}

const COMMAND_TIMEOUT_MS = 60_000;
const INSTALL_TIMEOUT_MS = 15 * 60_000;

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {}
  return `Edge tunnel command failed (${response.status})`;
}

@Injectable()
export class TunnelsService {
  private async execute(command: TunnelCommandPayload): Promise<unknown> {
    const response = await fetch(commandUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getInternalServiceAuthHeaders() },
      body: JSON.stringify({ version: 1, ...command } satisfies TunnelCommand),
      signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json();
  }

  cloudflaredStatus() {
    return this.execute({ command: "cloudflared.status" });
  }

  cloudflaredAction(action: "enable" | "disable") {
    return this.execute({ command: `cloudflared.${action}` });
  }

  ngrokStatus() {
    return this.execute({ command: "ngrok.status" });
  }

  ngrokAction(action: "enable" | "disable", authToken?: string) {
    return action === "enable"
      ? this.execute({ command: "ngrok.enable", authToken })
      : this.execute({ command: "ngrok.disable" });
  }

  tailscaleStatus() {
    return this.execute({ command: "tailscale.status" });
  }

  tailscaleCheck() {
    return this.execute({ command: "tailscale.check" });
  }

  tailscaleEnable(input: { sudoPassword?: string; hostname?: string; port?: number }) {
    return this.execute({ command: "tailscale.enable", ...input });
  }

  tailscaleDisable(input: { sudoPassword?: string }) {
    return this.execute({ command: "tailscale.disable", ...input });
  }

  tailscaleLogin(input: { hostname?: string }) {
    return this.execute({ command: "tailscale.login", ...input });
  }

  tailscaleDaemon(input: { sudoPassword?: string }) {
    return this.execute({ command: "tailscale.start-daemon", ...input });
  }

  async tailscaleInstall(input: { sudoPassword?: string }, onProgress: (message: string) => void) {
    const response = await fetch(commandUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getInternalServiceAuthHeaders() },
      body: JSON.stringify({ version: 1, command: "tailscale.install", ...input } satisfies TunnelCommand),
      signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS),
    });
    if (!response.ok || !response.body) throw new Error(await errorMessage(response));

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let completed = false;
    const consumeFrame = (frame: string): void => {
      const event = frame.match(/^event:\s*(.+)$/m)?.[1];
      const rawData = frame.match(/^data:\s*(.+)$/m)?.[1];
      if (!event || !rawData) return;
      let data: { message?: unknown; error?: unknown };
      try {
        data = JSON.parse(rawData) as { message?: unknown; error?: unknown };
      } catch {
        throw new Error("Invalid edge tunnel progress event");
      }
      if (event === "progress" && typeof data.message === "string") onProgress(data.message);
      if (event === "done") completed = true;
      if (event === "error") {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to install Tailscale.");
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      buffer += value ?? "";
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) consumeFrame(frame);
      if (done) break;
    }
    if (buffer.trim()) consumeFrame(buffer);
    if (!completed) throw new Error("Edge tunnel installation stream ended before completion");
  }
}
