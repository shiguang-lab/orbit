import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createAccessToken, listAccessTokens } from "@orbit/core/control/cli-access-tokens";
import { ACCESS_SCOPES } from "@orbit/core/control/cli-access-scopes";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";

/**
 * /api/cli/tokens — manage scoped CLI access tokens. Admin-only: the path is in
 * ADMIN_SCOPE_PREFIXES, so the central pipeline + requireManagementAuth both
 * require an `admin` credential (a read/write token gets 403 before here).
 */

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  return Response.json({ tokens: listAccessTokens() });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(ACCESS_SCOPES).optional(),
  expiresInDays: z.number().int().positive().max(3650).optional(),
});

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateBody(createSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { name, scope, expiresInDays } = validation.data;
  const expiresAt =
    typeof expiresInDays === "number"
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : null;

  const { record, secret } = createAccessToken({ name, scope: scope ?? "read", expiresAt });

  // `token` (the plaintext secret) is returned ONCE here and never again.
  return Response.json({
    success: true,
    token: secret,
    id: record.id,
    name: record.name,
    scope: record.scope,
    tokenPrefix: record.tokenPrefix,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  });
}
