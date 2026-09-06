export interface InstallResult { installedVersion: string; installPath: string; durationMs: number }
export const CLIPROXY_DEFAULT_PORT: number;
export const BIFROST_DEFAULT_PORT: number;
export const MUX_DEFAULT_PORT: number;
export const DARIO_DEFAULT_PORT: number;
export const SERVICE_VERSION_PATTERN: RegExp;
export class InstallError extends Error {
  readonly friendly: string;
  readonly httpStatus: number;
  constructor(message: string, friendly: string, httpStatus?: number);
}
export function getNineRouterInstalledVersion(): Promise<string | null>;
export function getNineRouterLatestVersion(): Promise<string | null>;
export function installNineRouter(version?: string): Promise<InstallResult>;
export function updateNineRouter(): Promise<InstallResult>;
export function resolveNineRouterSpawnArgs(apiKey: string, port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
export function getCliproxyInstalledVersion(): Promise<string | null>;
export function getCliproxyLatestVersion(): Promise<string | null>;
export function installCliproxy(version?: string): Promise<InstallResult>;
export function resolveCliproxySpawnArgs(port: number, managementKey?: string): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
export function getBifrostInstalledVersion(): Promise<string | null>;
export function getBifrostLatestVersion(): Promise<string | null>;
export function installBifrost(version?: string): Promise<InstallResult>;
export function updateBifrost(): Promise<InstallResult>;
export function resolveBifrostSpawnArgs(port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
export function resolveMuxSpawnArgs(apiKey: string, port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
export function resolveDarioSpawnArgs(apiKey: string, port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
