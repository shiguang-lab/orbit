export const LOCAL_ONLY_API_PREFIXES: ReadonlyArray<string>;
export const LOCAL_ONLY_API_PATTERNS: ReadonlyArray<RegExp>;
export const LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES: ReadonlyArray<string>;
export const ALWAYS_PROTECTED_API_PATHS: ReadonlyArray<string>;
export const SPAWN_CAPABLE_PREFIXES: ReadonlyArray<string>;
export const SPAWN_CAPABLE_PATTERNS: ReadonlyArray<RegExp>;
export const LOCAL_ONLY_API_GET_EXEMPTIONS: ReadonlySet<string>;

export function isLoopbackHost(hostHeader: string | null): boolean;
export function classifyHostLocality(ip: string | null): "loopback" | "lan" | "remote";
export function isPrivateLanHost(hostHeader: string | null): boolean;
export function isLocalOnlyPath(path: string, method?: string): boolean;
export function isLocalOnlyBypassableByManageScope(path: string): boolean;
export function isAlwaysProtectedPath(path: string): boolean;
