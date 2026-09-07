import { z } from "zod";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  getProviderKeyLimit,
  setProviderKeyLimit,
} from "@orbit/core/control/registered-keys";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";

const limitsSchema = z.object({
  maxActiveKeys: z.number().int().positive().nullable().optional(),
  dailyIssueLimit: z.number().int().positive().nullable().optional(),
  hourlyIssueLimit: z.number().int().positive().nullable().optional(),
});

function authRequired(): Response {
  return Response.json({ error: { message: "Authentication required" } }, { status: 401 });
}

/** GET /api/v1/providers/:provider/limits. */
export async function GET(request: Request, provider: string): Promise<Response> {
  if (!(await isAuthenticated(request))) return authRequired();

  const limits = getProviderKeyLimit(provider);
  return Response.json({ provider, limits: limits ?? null });
}

/** PUT /api/v1/providers/:provider/limits. */
export async function PUT(request: Request, provider: string): Promise<Response> {
  if (!(await isAuthenticated(request))) return authRequired();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateBody(limitsSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  setProviderKeyLimit(provider, validation.data);
  return Response.json({ provider, limits: getProviderKeyLimit(provider) });
}
