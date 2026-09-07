export const DARIO_DEFAULT_PORT: number;
export interface InstallResult { installedVersion: string; installPath: string; durationMs: number; }
export function getInstalledVersion(): Promise<string | null>;
export function getLatestVersion(): Promise<string | null>;
export function install(version?: string): Promise<InstallResult>;
export function update(): Promise<InstallResult>;
export function getDarioHomeDir(): string;
export function resolveSpawnArgs(apiKey: string, port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
