import { z } from "zod";

export const updateMitmSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  keyId: z.string().optional(),
  sudoPassword: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
});

export const regenerateMitmSchema = z.object({
  action: z.literal("regenerate-cert").optional(),
});
