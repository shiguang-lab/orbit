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


export const pricingFieldsSchema = z
  .object({
    input: z.number().min(0).optional(),
    output: z.number().min(0).optional(),
    cached: z.number().min(0).optional(),
    reasoning: z.number().min(0).optional(),
    cache_creation: z.number().min(0).optional(),
  })
  .strict();

export const updatePricingSchema = z.record(
  z.string().trim().min(1),
  z.record(z.string().trim().min(1), pricingFieldsSchema)
);

export const pricingSyncSourceSchema = z.enum(["litellm"]);

export const pricingSyncRequestSchema = z
  .object({
    sources: z.array(pricingSyncSourceSchema).min(1).optional(),
    dryRun: z.boolean().optional(),
  })
  .strict();