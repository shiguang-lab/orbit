import { Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  AgyAuthFileError,
  ClaudeAuthFileError,
  CodexAuthFileError,
  createClaudeConnectionFromAuthFile,
  createCodexConnectionFromAuthFile,
  createConnectionFromAgyToken,
  enrichWithAntigravityBackend,
  enrichWithBootstrap,
  extractAgyAuthZip,
  extractClaudeAuthZip,
  extractCodexAuthZip,
  getProviderAuditTarget,
  importAgyAuthBulkSchema,
  importAgyAuthSchema,
  importClaudeAuthBulkSchema,
  importClaudeAuthSchema,
  importCodexAuthBulkSchema,
  importCodexAuthSchema,
  parseAndValidateAgyToken,
  parseAndValidateClaudeAuth,
  parseAndValidateCodexAuth,
  sanitizeProviderSpecificDataForResponse,
} from "@shiguang-gateway/core-domain/control/provider-auth-import";
import {
  getAuditRequestContext,
  logAuditEvent,
} from "@shiguang-gateway/core-domain/control/compliance";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

const ZIP_BODY_LIMIT = 11 * 1024 * 1024;

export interface ProviderAuthOperationResult {
  status: number;
  body: unknown;
}

type ProviderAuthRequest = Request & {
  headers: Headers;
};

type ConnectionRecord = Record<string, unknown>;

function result(status: number, body: unknown): ProviderAuthOperationResult {
  return { status, body };
}

function sanitizeConnection(connection: ConnectionRecord): ConnectionRecord {
  const safe = { ...connection };
  delete safe.accessToken;
  delete safe.refreshToken;
  delete safe.idToken;
  delete safe.apiKey;
  if (safe.providerSpecificData) {
    safe.providerSpecificData = sanitizeProviderSpecificDataForResponse(safe.providerSpecificData);
  }
  return safe;
}

function parseBody(body: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    try {
      return { ok: true, value: JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : body) };
    } catch {
      return { ok: false };
    }
  }
  return { ok: true, value: body };
}

function errorFromFile(error: unknown, fallback: string): ProviderAuthOperationResult {
  if (
    error instanceof ClaudeAuthFileError ||
    error instanceof CodexAuthFileError ||
    error instanceof AgyAuthFileError
  ) {
    return result(error.status, { error: error.message, code: error.code });
  }
  return result(500, { error: sanitizeErrorMessage(error) || fallback });
}

/** Control-plane use cases for importing provider CLI credential files. */
@Injectable()
export class ProviderAuthImportService {
  async importClaude(request: ProviderAuthRequest, body: unknown): Promise<ProviderAuthOperationResult> {
    const parsed = parseBody(body);
    if (!parsed.ok) return result(400, { error: "Invalid JSON body" });
    const validation = validateBody(importClaudeAuthSchema, parsed.value);
    if (isValidationFailure(validation)) return result(400, { error: validation.error });

    const { source, name, email, overwriteExisting } = validation.data as any;
    let rawJson: unknown;
    try {
      rawJson = source.kind === "json" ? source.json : JSON.parse(source.text);
    } catch {
      return result(400, { error: "Could not parse the content as JSON", code: "invalid_json" });
    }

    const auditContext = getAuditRequestContext(request);
    try {
      const parsedAuth = parseAndValidateClaudeAuth(rawJson);
      const enriched = await enrichWithBootstrap(parsedAuth);
      const { connection, created } = await createClaudeConnectionFromAuthFile(enriched, {
        name,
        email,
        overwriteExisting,
      });
      logAuditEvent({
        action: "provider.credentials.imported",
        actor: "admin",
        target: getProviderAuditTarget(connection),
        resourceType: "provider_credentials",
        status: "success",
        ipAddress: auditContext.ipAddress || undefined,
        requestId: auditContext.requestId,
        metadata: {
          provider: "claude",
          created,
          email: enriched.email || email,
          hasAccountUUID: !!enriched.accountUUID,
        },
      });
      return result(200, { connection: sanitizeConnection(connection), created });
    } catch (error) {
      return errorFromFile(error, "Failed to import Claude auth");
    }
  }

  async importCodex(request: ProviderAuthRequest, body: unknown): Promise<ProviderAuthOperationResult> {
    const parsed = parseBody(body);
    if (!parsed.ok) return result(400, { error: "Invalid JSON body" });
    const validation = validateBody(importCodexAuthSchema, parsed.value);
    if (isValidationFailure(validation)) return result(400, { error: validation.error });

    const { source, name, email, overwriteExisting } = validation.data as any;
    let rawJson: unknown;
    try {
      rawJson = source.kind === "json" ? source.json : JSON.parse(source.text);
    } catch {
      return result(400, { error: "Could not parse the content as JSON", code: "invalid_json" });
    }

    const auditContext = getAuditRequestContext(request);
    try {
      const parsedAuth = parseAndValidateCodexAuth(rawJson);
      const { connection, created } = await createCodexConnectionFromAuthFile(parsedAuth, {
        name,
        email,
        overwriteExisting,
      });
      logAuditEvent({
        action: "provider.credentials.imported",
        actor: "admin",
        target: getProviderAuditTarget(connection),
        resourceType: "provider_credentials",
        status: "success",
        ipAddress: auditContext.ipAddress || undefined,
        requestId: auditContext.requestId,
        metadata: { provider: "codex", created, email: parsedAuth.email || email },
      });
      return result(200, { connection: sanitizeConnection(connection), created });
    } catch (error) {
      return errorFromFile(error, "Failed to import Codex auth");
    }
  }

  async importAgy(request: ProviderAuthRequest, body: unknown): Promise<ProviderAuthOperationResult> {
    const parsed = parseBody(body);
    if (!parsed.ok) return result(400, { error: "Invalid JSON body" });
    const validation = validateBody(importAgyAuthSchema, parsed.value);
    if (isValidationFailure(validation)) return result(400, { error: validation.error });

    const { source, name, email, overwriteExisting } = validation.data as any;
    let rawJson: unknown;
    try {
      rawJson = source.kind === "json" ? source.json : JSON.parse(source.text);
    } catch {
      return result(400, { error: "Could not parse the content as JSON", code: "invalid_json" });
    }

    const auditContext = getAuditRequestContext(request);
    try {
      const parsedAuth = parseAndValidateAgyToken(rawJson);
      const enriched = await enrichWithAntigravityBackend(parsedAuth);
      const { connection, created } = await createConnectionFromAgyToken(enriched, {
        name,
        email,
        overwriteExisting,
      });
      logAuditEvent({
        action: "provider.credentials.imported",
        actor: "admin",
        target: getProviderAuditTarget(connection),
        resourceType: "provider_credentials",
        status: "success",
        ipAddress: auditContext.ipAddress || undefined,
        requestId: auditContext.requestId,
        metadata: {
          provider: "agy",
          created,
          email: enriched.email || email,
          hasProjectId: !!enriched.projectId,
        },
      });
      return result(200, { connection: sanitizeConnection(connection), created });
    } catch (error) {
      return errorFromFile(error, "Failed to import Antigravity CLI auth");
    }
  }

  async importBulk(
    provider: "claude" | "codex" | "agy",
    request: ProviderAuthRequest,
    body: unknown,
  ): Promise<ProviderAuthOperationResult> {
    const parsed = parseBody(body);
    if (!parsed.ok) return result(400, { error: "Invalid JSON body" });
    const schema = provider === "claude"
      ? importClaudeAuthBulkSchema
      : provider === "codex"
        ? importCodexAuthBulkSchema
        : importAgyAuthBulkSchema;
    const validation = validateBody(schema, parsed.value);
    if (isValidationFailure(validation)) return result(400, { error: validation.error });

    const { entries, overwriteExisting } = validation.data as any;
    const created: ConnectionRecord[] = [];
    const errors: Array<{ index: number; name: string; message: string }> = [];
    const auditContext = getAuditRequestContext(request);

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const label = entry.name || `entry ${index + 1}`;
      try {
        let connection: ConnectionRecord;
        let email: string | undefined;
        if (provider === "claude") {
          const parsedAuth = parseAndValidateClaudeAuth(entry.json);
          const enriched = await enrichWithBootstrap(parsedAuth);
          email = enriched.email || entry.email;
          ({ connection } = await createClaudeConnectionFromAuthFile(enriched, {
            name: entry.name,
            email: entry.email,
            overwriteExisting,
          }));
        } else if (provider === "codex") {
          const parsedAuth = parseAndValidateCodexAuth(entry.json);
          email = parsedAuth.email || entry.email;
          ({ connection } = await createCodexConnectionFromAuthFile(parsedAuth, {
            name: entry.name,
            email: entry.email,
            overwriteExisting,
          }));
        } else {
          const parsedAuth = parseAndValidateAgyToken(entry.json);
          const enriched = await enrichWithAntigravityBackend(parsedAuth);
          email = enriched.email || entry.email;
          ({ connection } = await createConnectionFromAgyToken(enriched, {
            name: entry.name,
            email: entry.email,
            overwriteExisting,
          }));
        }
        created.push(sanitizeConnection(connection));
        logAuditEvent({
          action: "provider.credentials.imported",
          actor: "admin",
          target: getProviderAuditTarget(connection),
          resourceType: "provider_credentials",
          status: "success",
          ipAddress: auditContext.ipAddress || undefined,
          requestId: auditContext.requestId,
          metadata: { provider, email, bulkIndex: index },
        });
      } catch (error) {
        errors.push({
          index,
          name: label,
          message:
            error instanceof ClaudeAuthFileError ||
            error instanceof CodexAuthFileError ||
            error instanceof AgyAuthFileError
              ? error.message
              : sanitizeErrorMessage(error) || "Failed to import",
        });
      }
    }

    logAuditEvent({
      action: "provider.credentials.bulk_imported",
      actor: "admin",
      target: provider,
      resourceType: "provider_credentials",
      status: errors.length === entries.length ? "failure" : "success",
      ipAddress: auditContext.ipAddress || undefined,
      requestId: auditContext.requestId,
      metadata: { provider, total: entries.length, success: created.length, failed: errors.length },
    });
    return result(200, {
      success: created.length,
      failed: errors.length,
      total: entries.length,
      created,
      errors,
    });
  }

  async extractZip(
    provider: "claude" | "codex" | "agy",
    request: FastifyRequest,
  ): Promise<ProviderAuthOperationResult> {
    const contentLength = Number(request.headers["content-length"] || "0");
    if (contentLength > ZIP_BODY_LIMIT) {
      return result(413, { error: "ZIP file exceeds the 10 MB size limit", code: "file_too_large" });
    }

    let buffer: Buffer;
    try {
      const body = request.body as unknown;
      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else if (body instanceof Uint8Array) {
        buffer = Buffer.from(body);
      } else if (typeof body === "string") {
        buffer = Buffer.from(body);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of request.raw) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        buffer = Buffer.concat(chunks);
      }
    } catch {
      return result(400, { error: "Failed to read request body" });
    }
    if (buffer.byteLength > ZIP_BODY_LIMIT) {
      return result(413, { error: "ZIP file exceeds the 10 MB size limit", code: "file_too_large" });
    }

    try {
      const extract = provider === "claude"
        ? extractClaudeAuthZip
        : provider === "codex"
          ? extractCodexAuthZip
          : extractAgyAuthZip;
      const files = extract(buffer);
      const entries = files.map((file) => {
        try {
          return { name: file.name, json: JSON.parse(file.content), parseError: null };
        } catch {
          return { name: file.name, json: null, parseError: "Not valid JSON" };
        }
      });
      return result(200, { entries });
    } catch (error) {
      return result(400, {
        error: sanitizeErrorMessage(error) || "Failed to extract ZIP",
        code: "extract_failed",
      });
    }
  }
}
