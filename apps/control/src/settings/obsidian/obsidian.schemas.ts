import { z } from "zod";

export const obsidianTokenSchema = z.object({
  token: z.string().min(1).max(5000),
  baseUrl: z.string().url().optional(),
}).strict();

export const obsidianVaultSchema = z.object({ vaultPath: z.string().min(1).max(4096) }).strict();
