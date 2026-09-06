export type ProxyFallbackSelection = {
  proxy: unknown;
  level: string;
  levelId: string | null;
} | null;
export interface DbRuntimeHooks {
  removeConnectionHealth(connectionId: string): void;
  removeConnectionIndex(connectionId: string): void;
  revokeNativeCodexTurnPinsForConnection(connectionId: string): Promise<void> | void;
  selectWorkingProxyFallback(connectionId?: string): Promise<ProxyFallbackSelection>;
  resolveModelAlias(modelId: string): string;
  maybePrewarmUltraSlmOnConfig(config: {
    ultraEngine?: "heuristic" | "slm";
    ultraSlmPrewarm?: boolean;
  }): Promise<void> | void;
}
export declare function registerDbRuntimeHooks(hooks: Partial<DbRuntimeHooks>): void;
