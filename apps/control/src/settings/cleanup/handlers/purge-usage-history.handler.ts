import { z } from "zod";
import { buildErrorBody } from "@orbit/inference/utils/error";
import {
  RESET_USAGE_HISTORY_PERIODS,
  resetUsageHistory,
} from "@orbit/core/db/cleanup";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";

const resetUsageHistorySchema = z.object({
  period: z.enum(RESET_USAGE_HISTORY_PERIODS),
});

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { status: 400 },
    );
  }

  const validation = validateBody(resetUsageHistorySchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await resetUsageHistory(validation.data.period);
    return Response.json(
      {
        deleted: result.deleted,
        deletedUsageHistory: result.deletedUsageHistory,
        deletedDailySummary: result.deletedDailySummary,
        deletedHourlySummary: result.deletedHourlySummary,
        deletedCallLogs: result.deletedCallLogs,
        deletedCallLogArtifacts: result.deletedCallLogArtifacts,
        deletedRequestDetailLogs: result.deletedRequestDetailLogs,
        deletedProxyLogs: result.deletedProxyLogs,
        deletedRelayLogs: result.deletedRelayLogs,
        deletedCompressionAnalytics: result.deletedCompressionAnalytics,
        deletedCompressionRunTelemetry: result.deletedCompressionRunTelemetry,
        deletedRoutingDecisions: result.deletedRoutingDecisions,
        deletedQuotaConsumption: result.deletedQuotaConsumption,
        deletedTokenLedger: result.deletedTokenLedger,
        errors: result.errors,
      },
      { status: result.errors > 0 ? 500 : 200 },
    );
  } catch {
    return Response.json(buildErrorBody(500, "Failed to reset usage history"), { status: 500 });
  }
}
