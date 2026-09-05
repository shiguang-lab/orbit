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


export const payloadRuleModelSpecSchema = z
  .object({
    name: z.string().trim().min(1),
    protocol: z.string().trim().min(1).optional(),
  })
  .strict();

export const payloadMutationRuleSchema = z
  .object({
    models: z.array(payloadRuleModelSpecSchema).min(1),
    params: z
      .record(z.string().trim().min(1), z.unknown())
      .refine((value) => Object.keys(value).length > 0, "params must contain at least one path"),
  })
  .strict();

export const payloadFilterRuleSchema = z
  .object({
    models: z.array(payloadRuleModelSpecSchema).min(1),
    params: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const updatePayloadRulesSchema = z
  .object({
    default: z.array(payloadMutationRuleSchema).optional(),
    override: z.array(payloadMutationRuleSchema).optional(),
    filter: z.array(payloadFilterRuleSchema).optional(),
    defaultRaw: z.array(payloadMutationRuleSchema).optional(),
    "default-raw": z.array(payloadMutationRuleSchema).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.default === undefined &&
      value.override === undefined &&
      value.filter === undefined &&
      value.defaultRaw === undefined &&
      value["default-raw"] === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No valid fields to update",
        path: [],
      });
    }
  });