import { z } from "zod";
import { getContributorClaimUrl, getSupporterPlansUrl } from "../radar-links.js";
import { SUPPORTER_KEY_REGEX } from "../supporter-key.js";
import { getRadarSettings, setRadarKey, setRadarOptIn } from "@shiguang-gateway/core-domain/radar/store";
import { authorize, handleCorsOptions, json, internalError } from "../common.js";
const SettingsBodySchema = z.object({ optIn: z.boolean().optional(), supporterKey: z.string().regex(SUPPORTER_KEY_REGEX, 'Key must match "omr_" + 40 hex chars').nullable().optional() });
const maskKey = (key: string | null) => key ? `omr_****${key.slice(-4)}` : null;
export function OPTIONS() { return handleCorsOptions(); }
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  try { const settings = getRadarSettings(); return json({ optIn: settings.optIn, hasSupporterKey: settings.supporterKey !== null, supporterKeyMasked: maskKey(settings.supporterKey), contributorClaimUrl: getContributorClaimUrl(), supporterPlansUrl: getSupporterPlansUrl() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (cause) { return internalError(cause, "Failed to load Radar settings"); }
}
export async function POST(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  let body: unknown; try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = SettingsBodySchema.safeParse(body); if (!parsed.success) return json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { optIn, supporterKey } = parsed.data; if (optIn === undefined && supporterKey === undefined) return json({ error: "At least one of optIn or supporterKey is required" }, { status: 400 });
  try {
    if (optIn !== undefined) setRadarOptIn(optIn);
    if (supporterKey !== undefined) setRadarKey(supporterKey);
    return json({ ok: true, optIn: optIn ?? undefined, supporterKey: supporterKey !== undefined ? maskKey(supporterKey) : undefined });
  } catch (cause) { return internalError(cause, "Failed to update Radar settings"); }
}
