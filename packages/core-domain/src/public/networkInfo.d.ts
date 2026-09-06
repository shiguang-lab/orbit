export interface NetworkInfo {
  localUrl: string;
  lanUrls: string[];
  tailscaleUrl: string | null;
  tailscaleIpUrl: string | null;
}
export function resolveNetworkInfo(requestHost?: string | null): Promise<NetworkInfo>;
