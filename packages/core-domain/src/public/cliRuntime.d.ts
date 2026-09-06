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
export function ensureCliConfigWriteAllowed(targetPath?: string, options?: Record<string, unknown>): string | null;
export function getCliPrimaryConfigPath(toolId: string): string | null;
export function getCliRuntimeStatus(toolId: string): Promise<CliRuntimeStatus>;
