import type { z } from "zod";

export interface PricingFields {
  input?: number;
  output?: number;
  cached?: number;
  reasoning?: number;
  cache_creation?: number;
}

export type UpdatePricingBody = Record<string, Record<string, PricingFields>>;

export interface PricingSyncRequestBody {
  sources?: Array<"litellm">;
  dryRun?: boolean;
}

export const updatePricingSchema: z.ZodType<UpdatePricingBody>;
export const pricingSyncRequestSchema: z.ZodType<PricingSyncRequestBody>;

export function validateBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown
): { success: true; data: z.infer<TSchema> } | { success: false; error: { message: string; details: Array<{ field: string; message: string; keys?: string[] }> } };

export function isValidationFailure<TData>(
  validation: { success: true; data: TData } | { success: false; error: unknown }
): validation is { success: false; error: { message: string; details: Array<{ field: string; message: string; keys?: string[] }> } };

export function formatValidationMessage(error: {
  message: string;
  details: Array<{ field: string; message: string; keys?: string[] }>;
}): string;
