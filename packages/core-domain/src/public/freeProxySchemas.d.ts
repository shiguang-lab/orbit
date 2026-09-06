import type { z } from "zod";
import type { FreeProxySourceId } from "./freeProxies.d.ts";

export declare const freeProxySourceSchema: z.ZodType<FreeProxySourceId>;
export declare const freeProxyListSchema: z.ZodType<{
  sources?: FreeProxySourceId[];
  protocol?: "http" | "https" | "socks4" | "socks5";
  country?: string;
  minQuality?: number;
  search?: string;
  sortBy?: "quality" | "latency" | "recent";
  limit?: number;
  offset?: number;
  onlyNotInPool: boolean;
}>;
export declare const freeProxySyncSchema: z.ZodType<{ sources?: FreeProxySourceId[] }>;
export declare const freeProxyBulkAddSchema: z.ZodType<{ ids: string[] }>;
export declare const denoDeploySchema: z.ZodType<any>;
export declare const vercelDeploySchema: z.ZodType<any>;
export declare const cloudflareDeploySchema: z.ZodType<any>;
