export const intelligenceSyncRequestSchema: any;
export function syncArenaElo(dryRun?: boolean): Promise<{ success: boolean; [key: string]: unknown }>;
export function getArenaEloSyncStatus(): unknown;
export function clearSyncedIntelligence(): void;
