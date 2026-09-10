import { z } from "zod";

const booleanQueryParameter = z
  .string()
  .optional()
  .transform((value) => value === "1" || value === "true" || value === "yes");

export const freeProviderRankingsQuerySchema = z.object({
  category: z.string().min(1).max(50).optional(),
  limit: z.string().optional().transform((value) => {
    if (!value) return 50;
    const number = Number(value);
    return Number.isFinite(number) && number >= 1 ? Math.min(Math.round(number), 100) : 50;
  }),
  configuredOnly: booleanQueryParameter,
  availableOnly: booleanQueryParameter,
  withUsage: booleanQueryParameter,
  usageRange: z.enum(["1h", "24h", "7d", "30d"]).optional(),
  sortBy: z.enum(["elo", "reliability"]).optional(),
});
