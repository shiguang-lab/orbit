import { z } from "zod";

const faroResponseSchema = z.object({
  text: z.string(),
  pending: z.unknown().nullish(),
});

export interface FaroAnswer {
  ok: boolean;
  text: string;
  pending: unknown;
}

export interface FaroProxyOptions {
  fetchImpl?: typeof fetch;
}

const DEFAULT_FARO_URL = "http://127.0.0.1:7920";

export async function askFaro(message: string, opts: FaroProxyOptions = {}): Promise<FaroAnswer> {
  const base = process.env.CONDUCTOR_SPOKESPERSON_URL?.trim() || DEFAULT_FARO_URL;
  const token = process.env.CONDUCTOR_HUB_TOKEN?.trim() ?? "";
  try {
    const doFetch = opts.fetchImpl ?? fetch;
    const res = await doFetch(`${base}/ask`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) return { ok: false, text: "", pending: null };
    const parsed = faroResponseSchema.parse(await res.json());
    return { ok: true, text: parsed.text, pending: parsed.pending ?? null };
  } catch {
    return { ok: false, text: "", pending: null };
  }
}
