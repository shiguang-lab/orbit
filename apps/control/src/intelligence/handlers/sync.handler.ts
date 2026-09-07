/**
 * API Route: /api/intelligence/sync
 *
 * POST — Trigger a manual Arena ELO intelligence sync.
 * GET — Get current intelligence sync status.
 * DELETE — Clear all synced arena_elo intelligence data.
 */

import { requireManagementAuth } from "@orbit/core/control/management-auth";
import {
  clearSyncedIntelligence,
  getArenaEloSyncStatus,
  intelligenceSyncRequestSchema,
  syncArenaElo,
} from "@orbit/core/control/intelligence-sync";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  try {
    const validation = validateBody(intelligenceSyncRequestSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { dryRun = false } = validation.data;

    const result = await syncArenaElo(dryRun);

    return Response.json(result, { status: result.success ? 200 : 502 });
  } catch (err) {
    return Response.json(
      { error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    return Response.json(getArenaEloSyncStatus());
  } catch (err) {
    return Response.json(
      { error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    clearSyncedIntelligence();
    return Response.json({ success: true, message: "Synced intelligence data cleared" });
  } catch (err) {
    return Response.json(
      { error: sanitizeErrorMessage(err) },
      { status: 500 }
    );
  }
}
