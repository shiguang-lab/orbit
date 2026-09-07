export function buildProviderHealthMatrix(
  options: Record<string, unknown> | undefined,
  runtime: {
    getAllCircuitBreakerStatuses: () => unknown[];
    getAllModelLockouts: () => unknown[];
    resolveProviderAlias: (provider: string) => string | null;
    getWebSessionPoolHealth: (provider?: string) => { providers: any[] };
  }
): Promise<any>;
