export interface FreeOnboardingProvider { id: string; name: string; website: string; caution: string; defaultModel?: string; }
export function getEligibleFreeOnboardingProviders(): FreeOnboardingProvider[];
export function selectUnconfiguredFreeOnboardingProviders(candidates: FreeOnboardingProvider[], connections: Array<{ provider?: unknown }>): FreeOnboardingProvider[];
export function setupFreeProviderConnections(options: {
  requestedIds: string[];
  candidates: FreeOnboardingProvider[];
  listExisting: () => Promise<Array<{ provider?: unknown }>>;
  create: (input: { provider: string; authType: "no-auth"; name: string; isActive: true; testStatus: "unknown"; defaultModel?: string }) => Promise<{ id?: unknown } | null>;
}): Promise<{ results: Array<{ providerId: string; status: "created" | "skipped" | "failed"; connectionId?: string; reason?: string }> }>;
export function withFreeProviderSetupLock<T>(operation: () => Promise<T>): Promise<T>;
