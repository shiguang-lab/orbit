export interface ParsedClaudeAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  scopes: string[];
  subscriptionType: string | null;
  rateLimitTier: string | null;
  email: string | null;
}
export interface EnrichedClaudeAuth extends ParsedClaudeAuth {
  accountUUID: string | null;
  organizationUUID: string | null;
  organizationName: string | null;
  organizationType: string | null;
}
export interface ClaudeCreateConnectionOptions {
  name?: string;
  email?: string;
  overwriteExisting?: boolean;
}
export class ClaudeAuthFileError extends Error {
  status: number;
  code: string;
}
export function parseAndValidateClaudeAuth(raw: unknown): ParsedClaudeAuth;
export function enrichWithBootstrap(parsed: ParsedClaudeAuth): Promise<EnrichedClaudeAuth>;
export function createClaudeConnectionFromAuthFile(
  parsed: EnrichedClaudeAuth,
  options: ClaudeCreateConnectionOptions,
): Promise<{ connection: Record<string, unknown>; created: boolean }>;

export interface ParsedCodexAuth {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  accountId: string;
  userId: string | null;
  email: string | null;
  expiresAt: string | null;
}
export interface CodexCreateConnectionOptions {
  name?: string;
  email?: string;
  overwriteExisting?: boolean;
}
export class CodexAuthFileError extends Error {
  status: number;
  code: string;
}
export function parseAndValidateCodexAuth(raw: unknown): ParsedCodexAuth;
export function createCodexConnectionFromAuthFile(
  parsed: ParsedCodexAuth,
  options: CodexCreateConnectionOptions,
): Promise<{ connection: Record<string, unknown>; created: boolean }>;

export interface ParsedAgyAuth {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string | null;
  authMethod: string | null;
}
export interface EnrichedAgyAuth extends ParsedAgyAuth {
  email: string | null;
  projectId: string | null;
  tier: string | null;
}
export interface CreateAgyConnectionOptions {
  name?: string;
  email?: string;
  overwriteExisting?: boolean;
}
export class AgyAuthFileError extends Error {
  status: number;
  code: string;
}
export function parseAndValidateAgyToken(raw: unknown): ParsedAgyAuth;
export function enrichWithAntigravityBackend(parsed: ParsedAgyAuth): Promise<EnrichedAgyAuth>;
export function createConnectionFromAgyToken(
  parsed: EnrichedAgyAuth,
  options: CreateAgyConnectionOptions,
): Promise<{ connection: Record<string, unknown>; created: boolean }>;

export interface ExtractedZipFile {
  name: string;
  content: string;
}
export function extractClaudeAuthZip(zipBuffer: Buffer): ExtractedZipFile[];
export function extractCodexAuthZip(zipBuffer: Buffer): ExtractedZipFile[];
export function extractAgyAuthZip(zipBuffer: Buffer): ExtractedZipFile[];

export function sanitizeProviderSpecificDataForResponse(
  value: unknown,
): Record<string, unknown> | undefined;
export function getProviderAuditTarget(connection: unknown): string;

import type { z } from "zod";
export const importClaudeAuthSchema: z.ZodTypeAny;
export const importClaudeAuthBulkSchema: z.ZodTypeAny;
export const importCodexAuthSchema: z.ZodTypeAny;
export const importCodexAuthBulkSchema: z.ZodTypeAny;
export const importAgyAuthSchema: z.ZodTypeAny;
export const importAgyAuthBulkSchema: z.ZodTypeAny;
