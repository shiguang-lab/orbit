export const CLIPROXY_DEFAULT_PORT: number;

export interface InstallResult {
  installedVersion: string;
  installPath: string;
  durationMs: number;
}
export function install(version?: string): Promise<InstallResult>;
export function update(): Promise<InstallResult>;
export function getInstalledVersion(): Promise<string | null>;
export function getLatestVersion(): Promise<string | null>;
export function resolveSpawnArgs(port: number, managementKey?: string): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
};

export type CliproxyAccountHealthState =
  | "ready"
  | "disabled"
  | "missing_key"
  | "unreachable"
  | "unauthorized"
  | "unsupported"
  | "invalid_response";
export interface CliproxyRecentRequest { time: string; success: number; failed: number; }
export interface CliproxyAccountHealth {
  authIndex: string;
  provider: string;
  type: string;
  label: string;
  status: string;
  disabled: boolean;
  unavailable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  success: number;
  failed: number;
  recentRequests: CliproxyRecentRequest[];
}
export interface CliproxyAccountHealthResult {
  state: CliproxyAccountHealthState;
  accounts: CliproxyAccountHealth[];
  version: string | null;
}
export function getCliproxyAccountHealth(options?: Record<string, unknown>): Promise<CliproxyAccountHealthResult>;
export function sanitizeCliproxyAuthFiles(payload: unknown): CliproxyAccountHealth[] | null;

export type CliproxyLoginProvider = "codex" | "claude" | "antigravity" | "kimi" | "xai" | "gemini" | "qwen" | "github-copilot";
export interface CliproxyLoginJob {
  id: string;
  provider: CliproxyLoginProvider;
  status: "starting" | "awaiting_user" | "success" | "failed" | "timeout" | "canceled";
  authUrl?: string;
  userCode?: string;
  prompt?: string;
  error?: string;
  startedAt: number;
  expiresAt: number;
  terminalCommand: string;
}
export function startLoginJob(provider: CliproxyLoginProvider): Promise<CliproxyLoginJob>;
export function getLoginJob(jobId: string): CliproxyLoginJob | null;
export function cancelLoginJob(jobId: string): boolean;
export function resolvePortPid(port: number): Promise<number | null>;

export type CliproxyInstanceType = "local_managed" | "remote_agent";
export type CliproxyInstanceStatus = "healthy" | "unhealthy" | "stopped" | "unknown";
export interface CliproxyInstanceRecord {
  id: string;
  name: string;
  endpoint: string;
  managementKey: string | null;
  type: CliproxyInstanceType;
  enabled: boolean;
  weight: number;
  tags: string[];
  modelMappings: Record<string, string>;
  status: CliproxyInstanceStatus;
  lastHealthCheck: string | null;
  latencyMs: number | null;
  version: string | null;
  accountsCount: number;
  createdAt: string;
  updatedAt: string;
}
export function listCliproxyInstances(): CliproxyInstanceRecord[];
export function getCliproxyInstance(id: string): CliproxyInstanceRecord | null;
export function createCliproxyInstance(data: Partial<CliproxyInstanceRecord> & { name: string; endpoint: string }): CliproxyInstanceRecord;
export function updateCliproxyInstance(id: string, data: Partial<CliproxyInstanceRecord>): CliproxyInstanceRecord | null;
export function deleteCliproxyInstance(id: string): boolean;
export function probeCliproxyInstance(instance: CliproxyInstanceRecord, timeoutMs?: number): Promise<{
  status: CliproxyInstanceStatus;
  latencyMs?: number;
  version?: string | null;
  accountsCount?: number;
  error?: string;
}>;
export function getTargetCliproxyInstance(options?: { preferredInstanceId?: string; tag?: string }): CliproxyInstanceRecord | null;
