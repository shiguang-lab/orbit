export interface VersionManagerRow {
  tool: string;
  status: string;
  pid: number | null;
  port: number;
  healthStatus: string;
  errorMessage: string | null;
  [key: string]: unknown;
}

export function getVersionManagerStatus(): Promise<VersionManagerRow[]>;
export function getServiceRow(tool: string): Promise<VersionManagerRow | null>;

export interface SupervisorStatus {
  tool: string;
  state: string;
  pid?: number;
  port?: number;
  health?: string;
  lastError?: string;
  startedAt?: string | null;
  adopted?: boolean;
}

export function getSupervisor(tool: string): {
  start(): Promise<SupervisorStatus>;
  restart(): Promise<SupervisorStatus>;
  stop(): Promise<void>;
  getStatus(): SupervisorStatus;
} | null;
export function registerSupervisor(supervisor: unknown): void;
export function unregisterSupervisor(tool: string): void;

export class ServiceSupervisor {
  constructor(options: Record<string, unknown>);
  start(): Promise<SupervisorStatus>;
  restart(): Promise<SupervisorStatus>;
  stop(): Promise<void>;
  getStatus(): SupervisorStatus;
}

export function getOrCreateApiKey(tool: string): Promise<string>;

export const CLIPROXY_DEFAULT_PORT: number;
export interface InstallResult {
  installedVersion: string;
  installPath: string;
  durationMs: number;
}
export function install(version?: string): Promise<InstallResult>;
export function getInstalledVersion(): Promise<string | null>;
export function getLatestVersion(): Promise<string | null>;
export function resolveSpawnArgs(port: number, managementKey?: string): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
};

export const BIFROST_DEFAULT_PORT: number;
export function getBifrostInstalledVersion(): Promise<string | null>;
export function getBifrostLatestVersion(): Promise<string | null>;
export function installBifrost(version?: string): Promise<InstallResult>;
export function updateBifrost(): Promise<InstallResult>;
export function resolveBifrostSpawnArgs(port: number): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
};

export function updateServiceField(
  tool: string,
  field: string,
  value: string | number | boolean | null
): Promise<VersionManagerRow | null>;
