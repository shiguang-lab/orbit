import { z } from "zod";
import {
  ACCOUNT_FALLBACK_STRATEGY_VALUES,
  ROUTING_STRATEGY_VALUES,
} from "../../constants/routingStrategies.ts";
import { SUPPORTED_BATCH_ENDPOINTS } from "../../constants/batchEndpoints.ts";
import { MAX_REQUEST_BODY_LIMIT_MB, MIN_REQUEST_BODY_LIMIT_MB } from "../../constants/bodySize.ts";
import { COMBO_CONFIG_MODES } from "../../constants/comboConfigMode.ts";
import { providerAllowsOptionalApiKey } from "../../constants/providers.ts";
import { HIDEABLE_SIDEBAR_ITEM_IDS } from "../../constants/sidebarVisibility.ts";
import {
  isForbiddenUpstreamHeaderName,
  isForbiddenCustomHeaderName,
} from "../../constants/upstreamHeaders.ts";
import { MAX_TIMER_TIMEOUT_MS } from "../../utils/runtimeTimeouts.ts";

import { nonEmptyJsonRecordSchema } from "./misc.ts";

export const translatorDetectSchema = z.object({
  body: nonEmptyJsonRecordSchema,
});

export const translatorSendSchema = z.object({
  provider: z.string().trim().min(1, "Provider is required"),
  body: nonEmptyJsonRecordSchema,
});

export const translatorTranslateSchema = z
  .object({
    step: z.union([z.number().int().min(1).max(4), z.literal("direct")]),
    provider: z.string().trim().min(1).optional(),
    body: nonEmptyJsonRecordSchema,
    sourceFormat: z.string().optional(),
    targetFormat: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.step !== "direct" && !value.provider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Step and provider are required",
        path: ["provider"],
      });
    }
  });