export declare const REDIS_CONTAINER_NAME: string;
export declare const RUNTIME_PREFERENCE: readonly ["podman", "docker"];
export declare const REDIS_DEFAULT_BIND_HOST: "127.0.0.1";
export declare function buildRedisPublishSpec(bindHost?: string, hostPort?: string | number): string;
export declare function detectRedisContainerRuntime(): Promise<string | null>;
export declare function runRedisRuntimeCommand(runtime: string, args: readonly string[], timeout: number): Promise<{ stdout: string; stderr: string }>;
export declare function getRedisContainerState(runtime: string): Promise<{ exists: boolean; running: boolean }>;
export declare function parseRedisUrl(url?: string): { host: string; port: number } | null;
export declare function pingRedis(port: number | string, host?: string): Promise<boolean>;
