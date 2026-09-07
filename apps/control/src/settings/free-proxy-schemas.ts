import { z } from "zod";

export const freeProxySourceSchema = z.enum(["1proxy", "proxifly", "iplocate", "webshare"]);

export const freeProxyListSchema = z.object({
  sources: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").filter(Boolean) : undefined))
    .pipe(z.array(freeProxySourceSchema).optional()),
  protocol: z.enum(["http", "https", "socks4", "socks5"]).optional(),
  country: z
    .string()
    .max(2)
    .optional()
    .transform((value) => value?.toUpperCase()),
  minQuality: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().trim().min(1).max(128).optional(),
  sortBy: z.enum(["quality", "latency", "recent"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  onlyNotInPool: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true"),
});

export const freeProxySyncSchema = z.object({
  sources: z.array(freeProxySourceSchema).optional(),
});

export const freeProxyBulkAddSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const denoDeploySchema = z.object({
  denoToken: z
    .string()
    .min(20, "Deno Deploy token looks too short")
    .max(200)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Deno Deploy token must contain only alphanumeric, underscore, or hyphen"
    ),
  orgDomain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9.-]+$/i, "Organization domain must be a DNS-shaped hostname"),
  projectName: z
    .string()
    .min(3)
    .max(52)
    .regex(/^[a-z0-9-]+$/, "Project name must be lowercase alphanumeric with hyphens")
    .default("shiguangGateway-deno-relay"),
});

export const vercelDeploySchema = z.object({
  token: z
    .string()
    .min(20, "Vercel token looks too short")
    .max(200)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Vercel token must contain only alphanumeric, underscore, or hyphen"
    ),
  projectName: z
    .string()
    .min(3)
    .max(52)
    .regex(/^[a-z0-9-]+$/, "Project name must be lowercase alphanumeric with hyphens")
    .default("shiguangGateway-relay"),
});

export const cloudflareDeploySchema = z.object({
  accountId: z
    .string()
    .min(8, "Cloudflare Account ID looks too short")
    .max(64)
    .regex(/^[a-f0-9]+$/, "Cloudflare Account ID must be lowercase hex"),
  apiToken: z
    .string()
    .min(20, "Cloudflare API token looks too short")
    .max(200)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Cloudflare API token must contain only alphanumeric, underscore, or hyphen"
    ),
  projectName: z
    .string()
    .min(3)
    .max(52)
    .regex(/^[a-z0-9-]+$/, "Worker name must be lowercase alphanumeric with hyphens")
    .default("shiguangGateway-relay"),
});
