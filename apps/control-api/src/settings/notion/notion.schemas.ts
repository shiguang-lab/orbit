import { z } from "zod";

export const notionTokenSchema = z.object({
  token: z.string().min(1).max(500),
}).strict();
