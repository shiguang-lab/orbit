export interface MitmTarget {
  id: string;
  name: string;
  hosts: string[];
  port: number;
  [key: string]: unknown;
}

export interface MitmStatus {
  running: boolean;
  pid?: number | null;
  dnsConfigured?: boolean;
  certExists?: boolean;
  [key: string]: unknown;
}

export function getMitmStatus(agentId?: string): Promise<MitmStatus>;
export function getCachedPassword(): string | null;
export function setCachedPassword(password: string | null | undefined): void;
export function startMitm(
  apiKey: string,
  sudoPassword: string,
  options?: { port?: number },
): Promise<unknown>;
export function stopMitm(sudoPassword: string): Promise<unknown>;
export function generateCert(options?: { force?: boolean }): Promise<{ key: string; cert: string }>;
export function resolveMitmDataDir(): string;
export function isRoot(): boolean;

export const ANTIGRAVITY_MITM_PROFILE: MitmTarget & {
  targetHost: string;
  targetPort: number;
  localPort: number;
  apiEndpoints: string[];
  additionalHosts: string[];
};
export const KIRO_MITM_PROFILE: MitmTarget & {
  targetHost: string;
  targetPort: number;
  localPort: number;
  apiEndpoints: string[];
};
