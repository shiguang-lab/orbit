export * from "./versionManagerControl.d.ts";

export function generateServiceApiKey(prefix?: string): string;
export function maskApiKey(plainKey: string): string;

export interface NineRouterInstallResult {
  installedVersion: string;
  installPath: string;
  durationMs: number;
}

export function getNineRouterInstalledVersion(): Promise<string | null>;
export function getNineRouterLatestVersion(): Promise<string | null>;
export function installNineRouter(version?: string): Promise<NineRouterInstallResult>;
export function updateNineRouter(): Promise<NineRouterInstallResult>;
export function resolveNineRouterSpawnArgs(apiKey: string, port: number): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
};

export const SERVICE_VERSION_PATTERN: RegExp;
export class InstallError extends Error {
  readonly friendly: string;
  readonly httpStatus: number;
  constructor(message: string, friendly: string, httpStatus?: number);
}

export interface ServiceModel {
  id: string;
  name?: string;
  object?: string;
  owned_by?: string;
  created?: number;
  available?: boolean;
  [key: string]: unknown;
}

export function getServiceModels(tool: string): ServiceModel[];
export function syncServiceModels(tool: string, baseUrl: string, apiKey: string): Promise<number>;
