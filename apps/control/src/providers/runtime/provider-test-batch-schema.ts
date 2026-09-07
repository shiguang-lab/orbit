import { z } from "zod";

export const providersBatchTestSchema = z
  .object({
    mode: z.enum([
      "provider", "oauth", "free", "no-auth", "apikey", "compatible", "all",
      "web-cookie", "search", "audio", "local", "upstream-proxy", "cloud-agent",
      "ide", "selected",
    ]),
    providerId: z.string().trim().min(1).nullable().optional(),
    connectionIds: z.array(z.string().trim().min(1)).max(100).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === "provider" && !value.providerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "providerId is required when mode=provider",
        path: ["providerId"],
      });
    }
    if (value.mode === "selected" && (!value.connectionIds || value.connectionIds.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "connectionIds is required when mode=selected",
        path: ["connectionIds"],
      });
    }
  });
