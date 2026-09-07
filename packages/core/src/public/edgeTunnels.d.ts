type TunnelPhase =
  | "unsupported"
  | "not_installed"
  | "stopped"
  | "needs_auth"
  | "starting"
  | "running"
  | "error";

interface CloudflaredTunnelStatus {
  supported: boolean;
  installed: boolean;
  managedInstall: boolean;
  installSource: "managed" | "path" | "env" | null;
  binaryPath: string | null;
  running: boolean;
  pid: number | null;
  publicUrl: string | null;
  apiUrl: string | null;
  targetUrl: string;
  phase: Exclude<TunnelPhase, "needs_auth">;
  lastError: string | null;
  logPath: string;
}

interface NgrokTunnelStatus {
  supported: boolean;
  installed: boolean;
  running: boolean;
  publicUrl: string | null;
  apiUrl: string | null;
  targetUrl: string;
  phase: TunnelPhase;
  lastError: string | null;
}

type TailscaleTunnelInstallSource = "managed" | "path" | "env" | "windows-default";
type TailscaleTunnelPhase =
  | "unsupported"
  | "not_installed"
  | "needs_login"
  | "stopped"
  | "running"
  | "error";

interface TailscaleCheckStatus {
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
  connected?: boolean;
  ip?: string | null;
  ipv6?: string | null;
  hostname?: string | null;
  magicDns?: string | null;
  tailscaleUrl?: string | null;
  publicUrl?: string | null;
  mode?: "tsnet" | "daemon" | "external" | "manual";
  source?: string;
  socketPath?: string | null;
  backendState?: string | null;
}

interface TailscaleTunnelStatus extends TailscaleCheckStatus {
  enabled: boolean;
  phase: TailscaleTunnelPhase;
}

type TailscaleEnableResult =
  | { success: true; tunnelUrl: string; apiUrl: string | null; status: TailscaleTunnelStatus }
  | { success: false; needsLogin: true; authUrl: string; status: TailscaleTunnelStatus }
  | {
      success: false;
      funnelNotEnabled: true;
      enableUrl: string | null;
      status: TailscaleTunnelStatus;
    };

type TailscaleLoginResult = { alreadyLoggedIn: true } | { authUrl: string };
type TailscaleDaemonStartResult = {
  started: boolean;
  systemDaemon?: boolean;
};

export declare function getCloudflaredTunnelStatus(): Promise<CloudflaredTunnelStatus>;
export declare function startCloudflaredTunnel(): Promise<CloudflaredTunnelStatus>;
export declare function stopCloudflaredTunnel(): Promise<CloudflaredTunnelStatus>;
export declare function getNgrokTunnelStatus(): Promise<NgrokTunnelStatus>;
export declare function startNgrokTunnel(authToken?: string): Promise<NgrokTunnelStatus>;
export declare function stopNgrokTunnel(): Promise<NgrokTunnelStatus>;
export declare function getTailscaleCheckStatus(opts?: { requestHost?: string | null; port?: number | string }): Promise<TailscaleCheckStatus>;
export declare function getTailscaleTunnelStatus(opts?: { requestHost?: string | null; port?: number | string }): Promise<TailscaleTunnelStatus>;
export declare function enableTailscaleTunnel(input?: { sudoPassword?: string; hostname?: string; port?: number }): Promise<TailscaleEnableResult>;
export declare function disableTailscaleTunnel(input?: { sudoPassword?: string }): Promise<{
  success: true;
  status: TailscaleTunnelStatus;
}>;
export declare function startTailscaleLogin(input?: { hostname?: string; authKey?: string }): Promise<TailscaleLoginResult>;
export declare function startTailscaleDaemon(input?: { sudoPassword?: string }): Promise<TailscaleDaemonStartResult>;
export declare function installTailscale(input?: { sudoPassword?: string; onProgress?: (message: string) => void }): Promise<void>;
