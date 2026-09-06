import { z } from "zod";

export const MAX_PROVIDER_SPECIFIC_TIMEOUT_MS: number;
export function isValidGheUrl(raw: string): boolean;
export function validateProviderSpecificData(
  data: Record<string, unknown> | undefined,
  ctx: z.RefinementCtx,
): void;
