export interface InspectorCustomHostRow {
  host: string;
  enabled: boolean;
  label: string | null;
  kind: "llm" | "app" | "custom";
  added_at: string;
  last_seen_at: string | null;
}

export function listCustomHosts(opts?: { enabledOnly?: boolean }): InspectorCustomHostRow[];
export function addCustomHost(host: string, kind?: "llm" | "app" | "custom", label?: string): void;
export function removeCustomHost(host: string): void;
export function toggleCustomHost(host: string, enabled: boolean): void;

export interface HttpProxyServerHandle {
  port: number;
  stop(): Promise<void>;
}
export function startHttpProxyServer(port?: number): Promise<HttpProxyServerHandle>;
export function getHttpProxyHandle(): HttpProxyServerHandle | null;
export function setHttpProxyHandle(handle: HttpProxyServerHandle | null): void;
export function getSystemProxyState(): {
  applied: boolean;
  port: number | null;
  guardUntil: string | null;
  previousState?: unknown;
};
export function setSystemProxyApplied(port: number, previousState: unknown, guardMinutes: number): void;
export function clearSystemProxy(): void;
export function apply(port: number): Promise<{ platform: string; previousState: unknown }>;
export function revert(previousState: unknown): Promise<void>;
export function isTlsInterceptEnabled(): boolean;
export function setTlsIntercept(enabled: boolean): void;

export interface TrafficBuffer {
  list(filters?: Record<string, unknown>): unknown[];
  clear(): void;
  get(id: string): unknown | null;
  update(id: string, entry: unknown): void;
  push(entry: unknown): void;
  subscribe(listener: (event: unknown) => void): () => void;
}
export const globalTrafficBuffer: TrafficBuffer;

export function toHar(requests: unknown[]): unknown;

export function getCachedPassword(): string | null;
export function addDNSEntries(hosts: string[], sudoPassword: string): Promise<void>;
export function removeDNSEntries(hosts: string[], sudoPassword: string): Promise<void>;
export function maskSecret(value: string): string;
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, string>;
export function buildErrorBody(status: number, message: string): Record<string, unknown>;
export function getIngestTokenForBootstrap(): string;

type SchemaResult<T = any> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: { issues: Array<{ message: string }> } };
export const InspectorCustomHostSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorSessionStartSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorSessionPatchSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorSessionRequestAppendSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorListQuerySchema: { safeParse(input: unknown): SchemaResult };
export const InspectorCaptureModeActionSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorSystemProxyActionSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorTlsInterceptToggleSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorAnnotationPutSchema: { safeParse(input: unknown): SchemaResult };
export const InterceptedRequestSchema: { safeParse(input: unknown): SchemaResult };
