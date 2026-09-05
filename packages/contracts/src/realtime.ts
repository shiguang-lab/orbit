/** Wire contract for the realtime dashboard WebSocket. */

export type LiveChannel = "requests" | "combo" | "credentials" | "compression";

export interface WsSubscribeMessage {
  type: "subscribe";
  channels: LiveChannel[];
}

export interface WsPingMessage {
  type: "ping";
}

export type WsClientMessage = WsSubscribeMessage | WsPingMessage;

export interface WsEventMessage {
  type: "event";
  channel: LiveChannel;
  event: string;
  data: unknown;
}

export interface WsPongMessage {
  type: "pong";
}

export interface WsWelcomeMessage {
  type: "welcome";
  version: string;
  sessionId: string;
  serverTime: number;
  channels: LiveChannel[];
  backlog: number;
}

export interface WsErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export type WsServerMessage = WsEventMessage | WsPongMessage | WsWelcomeMessage | WsErrorMessage;

export interface WsAuthResult {
  authorized: boolean;
  sessionId: string;
  error?: string;
}
