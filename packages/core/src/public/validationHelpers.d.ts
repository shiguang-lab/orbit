import { z } from "zod";

export type ValidationResult<TData> =
  | { success: true; data: TData }
  | {
      success: false;
      error: {
        message: string;
        details: Array<{ field: string; message: string; keys?: string[] }>;
      };
    };

export function validateBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown
): ValidationResult<z.infer<TSchema>>;

export function isValidationFailure<TData>(
  validation: ValidationResult<TData>
): validation is Extract<ValidationResult<TData>, { success: false }>;

export function formatValidationMessage(error: {
  message: string;
  details: Array<{ field: string; message: string; keys?: string[] }>;
}): string;

export type ValidatedJsonBodyResult<TData> =
  | { success: true; data: TData }
  | { success: false; response: Response };

export function validatedJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<ValidatedJsonBodyResult<z.infer<TSchema>>>;
