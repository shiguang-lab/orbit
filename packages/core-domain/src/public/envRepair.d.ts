export interface EnvSyncPlan {
  available: boolean;
  created: boolean;
  added: number;
  missingEntries: Array<{ key: string }>;
}
export function getEnvSyncPlan(options: { scope: string; rootDir: string }): EnvSyncPlan;
export function syncEnv(options: {
  scope: string;
  quiet: boolean;
  rootDir: string;
}): { created: boolean; added: number };
