export interface CliRuntimeStatus {
  installed: boolean;
  runnable: boolean;
  command: string | null;
  commandPath: string | null;
  reason: string | null;
  runtimeMode: string;
  requiresBinary: boolean;
  version?: string;
}

export interface CliConfigWriteOptions {
  containerDeps?: {
    existsSync: (path: string) => boolean;
    readFileSync: (path: string, encoding: string) => string;
    env: NodeJS.ProcessEnv;
  };
  toolLabel?: string;
  hostCommand?: string;
}

export const CLI_TOOL_IDS: string[];
export function normalizeCliToolId(toolId: string): string;
export function shouldUseShellForCommand(command: string): boolean;
export function getKnownToolPaths(toolId: string): string[];
export function getLookupEnv(): NodeJS.ProcessEnv;
export function ensureCliConfigWriteAllowed(
  targetPath?: string,
  options?: CliConfigWriteOptions,
): string | null;
export function getCliConfigHome(containerDeps?: CliConfigWriteOptions["containerDeps"]): string;
export function getOpenCodeConfigPath(): string;
export function getCliConfigPaths(toolId: string): Record<string, string> | null;
export function getCliPrimaryConfigPath(toolId: string): string | null;
export function getCliRuntimeStatus(toolId: string): Promise<CliRuntimeStatus>;
