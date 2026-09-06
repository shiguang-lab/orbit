import { z } from "zod";

/** Provider-scoped chat only validates fields used for routing; handleChat owns full validation. */
export const providerChatBodySchema = z.object({ model: z.string().optional() }).passthrough();

export type ProviderChatBody = z.infer<typeof providerChatBodySchema> & {
  model?: string;
  [key: string]: unknown;
};
