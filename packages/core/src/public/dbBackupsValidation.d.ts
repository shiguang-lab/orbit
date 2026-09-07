import type { z } from "zod";

export interface DbBackupCleanupInput {
  keepLatest?: number;
  retentionDays?: number;
}

export interface DbBackupRestoreInput {
  backupId: string;
}

export const dbBackupCleanupSchema: z.ZodType<DbBackupCleanupInput>;
export const dbBackupRestoreSchema: z.ZodType<DbBackupRestoreInput>;
export function validateBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown
): { success: true; data: z.infer<TSchema> } | { success: false; error: { message: string; details: Array<{ field: string; message: string }> } };
export function isValidationFailure<TData>(
  validation: { success: true; data: TData } | { success: false; error: unknown }
): validation is { success: false; error: { message: string; details: Array<{ field: string; message: string }> } };
