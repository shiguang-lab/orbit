import { z } from "zod";

/** Payload accepted when configuring the local corpus root. */
export const localCorpusSchema = z
  .object({
    rootPath: z.string().trim().min(1).max(4_096),
  })
  .strict();

