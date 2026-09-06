export interface EnsuredManagementPassword {
  hash: string | null;
  migrated: boolean;
  settings: Record<string, unknown>;
  source: "stored_hash" | "stored_plaintext" | "env" | "missing";
}
export function ensurePersistentManagementPasswordHash(options?: {
  initialPassword?: string | null;
  logger?: Pick<Console, "log"> & Partial<Pick<Console, "warn">>;
  settings?: Record<string, unknown>;
  source?: string;
}): Promise<EnsuredManagementPassword>;
export function getStoredManagementPassword(settings: Record<string, unknown> | null | undefined): string;
export function verifyManagementPassword(password: string, hash: string): Promise<boolean>;
export function hasManagementPasswordConfigured(settings: Record<string, unknown> | null | undefined): boolean;
export function hashManagementPassword(password: string): Promise<string>;
