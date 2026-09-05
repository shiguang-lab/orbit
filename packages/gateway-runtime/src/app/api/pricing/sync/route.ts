/**
 * API Route: /api/pricing/sync
 *
 * POST — Trigger a manual pricing sync from external sources.
 * GET  — Get current sync status.
 * DELETE — Clear all synced pricing data.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireManagementAuth } from "../../../../lib/api/requireManagementAuth.ts";
import { pricingSyncRequestSchema } from "../../../../shared/validation/schemas.ts";
import { isValidationFailure, validateBody } from "../../../../shared/validation/helpers.ts";

export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
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
    const validation = validateBody(pricingSyncRequestSchema, rawBody);
    if (isValidationFailure(validation)) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { sources, dryRun = false } = validation.data;

    const { syncPricingFromSources } = await import("../../../../lib/pricingSync.ts");
    const result = await syncPricingFromSources({ sources, dryRun });

    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { getSyncStatus } = await import("../../../../lib/pricingSync.ts");
    return NextResponse.json(getSyncStatus());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { clearSyncedPricing } = await import("../../../../lib/pricingSync.ts");
    clearSyncedPricing();
    return NextResponse.json({ success: true, message: "Synced pricing data cleared" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
