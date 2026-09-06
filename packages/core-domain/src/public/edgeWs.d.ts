export const DEFAULT_WS_PATH: "/v1/ws";

export type WsAuthType = "none" | "api_key" | "session";

export interface WsRuntimeConfig {
  wsAuth: boolean;
  wsPath: string;
}

export interface WsHandshakeAuthResult extends WsRuntimeConfig {
  authorized: boolean;
  authenticated: boolean;
  authType: WsAuthType;
  hasCredential: boolean;
}

export function extractWsTokenFromUrl(input: string | URL): string | null;
export function extractWsTokenFromRequest(request: Request): string | null;
export function getWsRuntimeConfig(): Promise<WsRuntimeConfig>;
export function authorizeWebSocketHandshake(request: Request): Promise<WsHandshakeAuthResult>;
