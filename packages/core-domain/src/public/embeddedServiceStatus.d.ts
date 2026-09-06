export interface VersionManagerTool {
  id: number;
  tool: string;
  currentVersion: string | null;
  installedVersion: string | null;
  pinnedVersion: string | null;
  binaryPath: string | null;
  status: string;
  pid: number | null;
  port: number;
  apiKey: string | null;
  managementKey: string | null;
  autoUpdate: boolean;
  autoStart: boolean;
  autoRestartAdopted: boolean;
  lastHealthCheck: string | null;
  lastUpdateCheck: string | null;
  healthStatus: string;
  configOverrides: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  logsBufferPath: string | null;
  providerExpose: boolean;
  lastSyncAt: string | null;
}
export function getServiceRow(tool: string): Promise<VersionManagerTool | null>;
export function getVersionManagerStatus(): Promise<VersionManagerTool[]>;
