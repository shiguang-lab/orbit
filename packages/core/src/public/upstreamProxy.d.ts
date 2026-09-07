export type FallbackBackend = "cliproxyapi" | "dario";

export function validateProxyUrl(
  value: string,
): { valid: true; url: string } | { valid: false; error: string };

export interface UpstreamProxyConfig {
  id: number;
  providerId: string;
  mode: string;
  cliproxyapiModelMapping: Record<string, unknown> | null;
  nativePriority: number;
  cliproxyapiPriority: number;
  enabled: boolean;
  family: string;
  fallbackBackend: FallbackBackend;
  createdAt: string;
  updatedAt: string;
}

export function getUpstreamProxyConfig(providerId: string): Promise<UpstreamProxyConfig | null>;
export function upsertUpstreamProxyConfig(data: {
  providerId: string;
  mode?: string;
  cliproxyapiModelMapping?: Record<string, unknown> | null;
  nativePriority?: number;
  cliproxyapiPriority?: number;
  enabled?: boolean;
  family?: string;
  fallbackBackend?: FallbackBackend;
}): Promise<UpstreamProxyConfig | null>;
export function deleteUpstreamProxyConfig(providerId: string): Promise<boolean>;
