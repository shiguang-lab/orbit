import { z } from "zod";

const modelIdSchema = z.string().trim().min(1, "Model is required").max(200);
const nonEmptyStringSchema = z.string().trim().min(1, "Field is required");

/** Public Jina zero/few-shot classification request contract. */
export const v1ClassifySchema = z
  .object({
    model: modelIdSchema.optional(),
    classifier_id: z.string().trim().min(1).optional(),
    input: z.union([
      nonEmptyStringSchema,
      z.array(z.unknown()).min(1, "input must contain at least one item"),
    ]),
    labels: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .catchall(z.unknown());

export type V1ClassifyRequest = z.infer<typeof v1ClassifySchema>;
