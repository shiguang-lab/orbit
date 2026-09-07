import type { buildConnector } from "undici";

export declare function getModelSyncInternalBaseUrl(): string;
export declare function resolveModelSyncInternalBaseUrl(candidate?: string): string;
export declare function createPinnedModelSyncTlsConnector(
  connect?: buildConnector.connector,
): buildConnector.connector;
export declare const fetchModelSyncInternal: typeof fetch;
export declare function getModelSyncInternalAuthHeaderName(): string;
export declare function buildModelSyncInternalHeaders(): Record<string, string>;
export declare function isModelSyncInternalRequest(request: { headers: Headers }): boolean;
