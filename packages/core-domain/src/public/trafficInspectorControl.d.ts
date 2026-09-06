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
export function getHttpProxyHandle(): HttpProxyServerHandle | null;
export function getSystemProxyState(): {
  applied: boolean;
  port: number | null;
  guardUntil: string | null;
};
export function isTlsInterceptEnabled(): boolean;

export interface TrafficBuffer {
  list(filters?: Record<string, unknown>): unknown[];
  clear(): void;
}
export const globalTrafficBuffer: TrafficBuffer;

export interface InspectorSessionRow {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  request_count: number;
  profile: "llm" | "custom" | "all" | null;
}
export function listSessions(): InspectorSessionRow[];
export function createSession(opts?: { name?: string }): { id: string; started_at: string };

export function getCachedPassword(): string | null;
export function addDNSEntries(hosts: string[], sudoPassword: string): Promise<void>;

type SchemaResult<T = any> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: { issues: Array<{ message: string }> } };
export const InspectorCustomHostSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorSessionStartSchema: { safeParse(input: unknown): SchemaResult };
export const InspectorListQuerySchema: { safeParse(input: unknown): SchemaResult };
