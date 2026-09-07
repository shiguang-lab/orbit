import { z } from "zod";
import { getAuditRequestContext, logAuditEvent } from "@orbit/core/compliance/audit-log";
import { getCachedSettings } from "@orbit/core/db/settings";
import {
  ensurePersistentManagementPasswordHash,
  getStoredManagementPassword,
  verifyManagementPassword,
} from "@orbit/core/control/management-password";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { checkLoginGuard, clearLoginAttempts, recordLoginFailure } from "../../auth/login.guard.js";
import { createAccessToken } from "@orbit/core/control/cli-access-tokens";
import { ACCESS_SCOPES } from "@orbit/core/control/cli-access-scopes";

/**
 * POST /api/cli/connect — remote-mode bootstrap.
 *
 * Exchange the management password for a scoped CLI access token. Public route
 * (no token exists yet) that does its OWN password verification + brute-force
 * lockout, mirroring /api/auth/login — but mints an `oma_` access token instead
 * of a dashboard JWT cookie. The plaintext token is returned exactly once.
 *
 * Default scope is `admin`: the password holder is the owner and can already do
 * anything; the first token should be able to mint narrower tokens for other
 * machines. Pass `scope` to downscope (e.g. a read-only CI token).
 */

const connectSchema = z.object({
  password: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  scope: z.enum(ACCESS_SCOPES).optional(),
  expiresInDays: z.number().int().positive().max(3650).optional(),
});

export async function POST(request: Request) {
  const auditContext = getAuditRequestContext(request);

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateBody(connectSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { password, name, scope, expiresInDays } = validation.data;

    const settings = await getCachedSettings();
    const bruteForceEnabled = settings.bruteForceProtection !== false;
    const clientIp = auditContext.ipAddress || null;

    const guardCheck = checkLoginGuard(clientIp, { enabled: bruteForceEnabled });
    if (!guardCheck.allowed) {
      logAuditEvent({
        action: "cli.connect.locked",
        actor: "anonymous",
        target: "cli-access-token",
        resourceType: "auth_session",
        status: "failed",
        ipAddress: clientIp || undefined,
        requestId: auditContext.requestId,
        metadata: { retryAfterSeconds: guardCheck.retryAfterSeconds || 0 },
      });
      return Response.json(
        { error: "Too many failed attempts. Try again later." },
        {
          status: 429,
          headers: guardCheck.retryAfterSeconds
            ? { "Retry-After": String(guardCheck.retryAfterSeconds) }
            : {},
        }
      );
    }

    const passwordState = await ensurePersistentManagementPasswordHash({
      settings,
      source: "cli.connect",
    });
    const storedHash = getStoredManagementPassword(passwordState.settings);
    if (!storedHash) {
      return Response.json(
        { error: "No password configured. Complete onboarding first.", needsSetup: true },
        { status: 403 }
      );
    }

    const isValid = await verifyManagementPassword(password, storedHash);
    if (!isValid) {
      const failureDecision = recordLoginFailure(clientIp, { enabled: bruteForceEnabled });
      logAuditEvent({
        action: "cli.connect.failed",
        actor: "anonymous",
        target: "cli-access-token",
        resourceType: "auth_session",
        status: "failed",
        ipAddress: clientIp || undefined,
        requestId: auditContext.requestId,
        metadata: { reason: "invalid_password", lockedOut: failureDecision.allowed === false },
      });
      if (!failureDecision.allowed) {
        return Response.json(
          { error: "Too many failed attempts. Try again later." },
          {
            status: 429,
            headers: failureDecision.retryAfterSeconds
              ? { "Retry-After": String(failureDecision.retryAfterSeconds) }
              : {},
          }
        );
      }
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }

    clearLoginAttempts(clientIp);

    const tokenScope = scope ?? "admin";
    const tokenName = (name ?? "remote-cli").trim() || "remote-cli";
    const expiresAt =
      typeof expiresInDays === "number"
        ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
        : null;

    const { record, secret } = createAccessToken({
      name: tokenName,
      scope: tokenScope,
      expiresAt,
    });

    logAuditEvent({
      action: "cli.connect.success",
      actor: "admin",
      target: "cli-access-token",
      resourceType: "auth_session",
      status: "success",
      ipAddress: clientIp || undefined,
      requestId: auditContext.requestId,
      metadata: { tokenId: record.id, scope: tokenScope },
    });

    return Response.json({
      success: true,
      token: secret,
      id: record.id,
      name: record.name,
      scope: record.scope,
      expiresAt: record.expiresAt,
    });
  } catch (error) {
    console.error("[CLI] connect failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
