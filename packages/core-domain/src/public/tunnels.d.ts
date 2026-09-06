export interface CloudflaredTunnelStatus { [key: string]: unknown }
export interface NgrokTunnelStatus { [key: string]: unknown }
export interface TailscaleTunnelStatus { [key: string]: unknown }
export interface TailscaleCheckStatus { [key: string]: unknown }
export interface TailscaleEnableResult { [key: string]: unknown }

export declare function getCloudflaredTunnelStatus(): Promise<CloudflaredTunnelStatus>;
export declare function startCloudflaredTunnel(): Promise<CloudflaredTunnelStatus>;
export declare function stopCloudflaredTunnel(): Promise<CloudflaredTunnelStatus>;
export declare function getNgrokTunnelStatus(): Promise<NgrokTunnelStatus>;
export declare function startNgrokTunnel(authToken?: string): Promise<NgrokTunnelStatus>;
export declare function stopNgrokTunnel(): Promise<NgrokTunnelStatus>;
export declare function getTailscaleCheckStatus(): Promise<TailscaleCheckStatus>;
export declare function getTailscaleTunnelStatus(): Promise<TailscaleTunnelStatus>;
export declare function enableTailscaleTunnel(input: { sudoPassword?: string; hostname?: string; port?: number }): Promise<TailscaleEnableResult>;
export declare function disableTailscaleTunnel(input: { sudoPassword?: string }): Promise<Record<string, unknown>>;
export declare function startTailscaleLogin(input: { hostname?: string }): Promise<Record<string, unknown>>;
export declare function startTailscaleDaemon(input: { sudoPassword?: string }): Promise<void>;
export declare function installTailscale(input: { sudoPassword?: string; onProgress?: (message: string) => void }): Promise<void>;
