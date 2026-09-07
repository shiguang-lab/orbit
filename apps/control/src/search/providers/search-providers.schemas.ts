import { z } from "zod";

export const SearchProviderCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["search", "fetch"]),
  costPerQuery: z.number().nonnegative(),
  freeMonthlyQuota: z.number().int().nonnegative(),
  searchTypes: z.array(z.string()).optional(),
  fetchFormats: z.array(z.string()).optional(),
  status: z.enum(["configured", "missing", "rate_limited"]),
  configureHref: z.string().default("/dashboard/providers"),
});

export const SearchProviderCatalogResponseSchema = z.object({
  providers: z.array(SearchProviderCatalogItemSchema),
});

export type SearchProviderCatalogItem = z.infer<typeof SearchProviderCatalogItemSchema>;
