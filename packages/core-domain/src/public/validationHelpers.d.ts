export function validateBody<TSchema>(schema: TSchema, body: unknown): { success: true; data: any } | { success: false; error: { message: string } };
export function isValidationFailure(value: unknown): value is { success: false; error: { message: string } };
export function formatValidationMessage(error: { message: string; details?: Array<{ field?: string; message: string }> }): string;
