export const DARIO_DEFAULT_PORT: number;
export function getDarioHomeDir(): string;
export function resolveSpawnArgs(apiKey: string, port: number): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
