import type { z } from "zod";

export const evalRunSuiteSchema: z.ZodType<any>;
export const evalSuiteSaveSchema: z.ZodType<any>;
export function validateBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown
): { success: true; data: z.infer<TSchema> } | { success: false; error: { message: string; details: Array<{ field: string; message: string }> } };
export function isValidationFailure<TData>(
  validation: { success: true; data: TData } | { success: false; error: unknown }
): validation is { success: false; error: { message: string; details: Array<{ field: string; message: string }> } };
