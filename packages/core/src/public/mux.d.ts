export interface MuxInstallResult {
  installedVersion: string;
  installPath: string;
  durationMs: number;
}

export const MUX_DEFAULT_PORT: number;
export function getInstalledVersion(): Promise<string | null>;
export function getLatestVersion(): Promise<string | null>;
export function installMux(version?: string): Promise<MuxInstallResult>;
export function update(): Promise<MuxInstallResult>;
export function resolveMuxSpawnArgs(apiKey: string, port: number): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
};

export { getOrCreateApiKey, getSupervisor, registerSupervisor, ServiceSupervisor } from "./versionManagerControl.d.ts";
