import { z } from "zod";

export const updateModelAliasesSchema = z.object({
  aliases: z.record(z.string().trim().min(1), z.string().trim().min(1)),
});

export const addModelAliasSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
});

export const removeModelAliasSchema = z.object({
  from: z.string().trim().min(1),
});
