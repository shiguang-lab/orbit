import { z } from "zod";

export const qdrantSettingsUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    collection: z.string().min(1).optional(),
    embeddingModel: z.string().min(1).optional(),
    quantization: z.enum(["none", "int8", "binary"]).optional(),
    apiKey: z.string().optional(),
  })
  .strict();

export const qdrantSearchSchema = z
  .object({
    query: z.string().min(1),
    topK: z.number().int().min(1).max(50).default(5),
  })
  .strict();

