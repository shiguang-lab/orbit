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

const hooks: DbRuntimeHooks = {
  removeConnectionHealth() {},
  removeConnectionIndex() {},
  revokeNativeCodexTurnPinsForConnection() {},
  async selectWorkingProxyFallback() {
    return null;
  },
  resolveModelAlias(modelId) {
    return modelId;
  },
  maybePrewarmUltraSlmOnConfig() {},
};

export function registerDbRuntimeHooks(next: Partial<DbRuntimeHooks>): void {
  Object.assign(hooks, next);
}

export const removeConnectionHealth = (connectionId: string): void =>
  hooks.removeConnectionHealth(connectionId);
export const removeConnectionIndex = (connectionId: string): void =>
  hooks.removeConnectionIndex(connectionId);
export const revokeNativeCodexTurnPinsForConnection = (connectionId: string): Promise<void> =>
  Promise.resolve(hooks.revokeNativeCodexTurnPinsForConnection(connectionId));
export const selectWorkingProxyFallback = (connectionId?: string): Promise<ProxyFallbackSelection> =>
  hooks.selectWorkingProxyFallback(connectionId);
export const resolveModelAlias = (modelId: string): string => hooks.resolveModelAlias(modelId);
export const maybePrewarmUltraSlmOnConfig = (
  config: { ultraEngine?: "heuristic" | "slm"; ultraSlmPrewarm?: boolean },
): Promise<void> => Promise.resolve(hooks.maybePrewarmUltraSlmOnConfig(config));
