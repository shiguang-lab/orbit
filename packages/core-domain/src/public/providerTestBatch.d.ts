import type { z } from "zod";

export declare const providersBatchTestSchema: z.ZodTypeAny;
export declare function testSingleConnection(connectionId: string, validationModelId?: string): Promise<Record<string, unknown> & { valid: boolean; latencyMs?: number; error?: string | null; diagnosis?: unknown; statusCode?: number | null; testedAt?: string }>;
export declare const AI_PROVIDERS: Record<string, { hasFree?: boolean }>;
export declare const NOAUTH_PROVIDERS: Record<string, unknown>;
export declare const OAUTH_PROVIDERS: Record<string, unknown>;
export declare const APIKEY_PROVIDERS: Record<string, unknown>;
export declare const LOCAL_PROVIDERS: Record<string, unknown>;
export declare const UPSTREAM_PROXY_PROVIDERS: Record<string, unknown>;
export declare const WEB_COOKIE_PROVIDERS: Record<string, unknown>;
export declare const SEARCH_PROVIDERS: Record<string, unknown>;
export declare const AUDIO_ONLY_PROVIDERS: Record<string, unknown>;
export declare const CLOUD_AGENT_PROVIDERS: Record<string, unknown>;
export declare const IDE_PROVIDER_IDS: ReadonlySet<string>;
export declare const OPENAI_COMPATIBLE_PREFIX: string;
export declare const ANTHROPIC_COMPATIBLE_PREFIX: string;
export declare function getProviderConnectionFamilyIds(providerId: string): string[];
