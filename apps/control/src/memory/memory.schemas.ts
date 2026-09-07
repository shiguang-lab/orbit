import { z } from "zod";
import { MemoryType } from "@orbit/core/memory/runtime";

const optionalCustomEmbeddingValue = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(2048).nullable().optional(),
);

const optionalCustomEmbeddingUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    }, "Custom embedding endpoint must be an HTTP(S) URL without credentials or query data")
    .nullable()
    .optional(),
);

/** HTTP input contracts belong to the control app, not the shared runtime. */
export const CreateMemorySchema = z
  .object({
    content: z.string().min(1),
    key: z.string().min(1),
    type: z.nativeEnum(MemoryType).default(MemoryType.FACTUAL),
    sessionId: z.string().default(""),
    apiKeyId: z.string().default(""),
    metadata: z.record(z.string(), z.unknown()).default({}),
    expiresAt: z.coerce.date().nullable().default(null),
  })
  .strict();

export const UpdateMemorySchema = z
  .object({
    type: z.nativeEnum(MemoryType).optional(),
    key: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const RetrievePreviewSchema = z
  .object({
    query: z.string().min(1),
    strategy: z.enum(["exact", "semantic", "hybrid"]).default("hybrid"),
    maxTokens: z.number().int().positive().max(16000).default(2000),
    apiKeyId: z.string().optional(),
    limit: z.number().int().positive().max(100).default(20),
  })
  .strict();

export const ReindexSchema = z.object({ force: z.boolean().default(false) }).strict();

export const SummarizeSchema = z
  .object({
    olderThanDays: z.number().int().positive().max(365).default(30),
    apiKeyId: z.string().optional(),
    dryRun: z.boolean().default(false),
  })
  .strict();

export const MemorySettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxTokens: z.number().int().min(0).max(16000).optional(),
    retentionDays: z.number().int().min(1).max(365).optional(),
    strategy: z.enum(["recent", "semantic", "hybrid"]).optional(),
    skillsEnabled: z.boolean().optional(),
    embeddingSource: z.enum(["remote", "static", "transformers", "auto"]).optional(),
    embeddingProviderModel: z.string().nullable().optional(),
    customBaseUrl: optionalCustomEmbeddingUrl,
    customModelId: optionalCustomEmbeddingValue,
    transformersEnabled: z.boolean().optional(),
    staticEnabled: z.boolean().optional(),
    rerankEnabled: z.boolean().optional(),
    rerankProviderModel: z.string().nullable().optional(),
    vectorStore: z.enum(["sqlite-vec", "qdrant", "auto"]).optional(),
    primaryBackend: z.string().optional(),
    fallbackBackends: z.array(z.string()).optional(),
    backendConfigs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  })
  .strict();

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
