import { Injectable } from "@nestjs/common";
import { isPrivateHost } from "@orbit/utils/network";
import { getProxyCandidates, testProxiesAgainstTarget } from "@orbit/inference/utils/proxyFallback";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { arePrivateProviderUrlsAllowed } from "@orbit/core/network/outbound-url-guard-policy";
import { z } from "zod";

const schema = z.object({ targetUrl: z.string().url("Invalid target URL"), proxyUrls: z.array(z.string()).optional() });

@Injectable()
export class ProxyFallbackService {
  async test(request: Request): Promise<Response> {
    const body = await request.json().catch(() => undefined);
    const validation = validateBody(schema, body);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const { targetUrl, proxyUrls: provided } = validation.data;
    if (this.blocked(targetUrl)) return Response.json({ error: "Blocked private or local target URL" }, { status: 400 });
    if (provided?.some((url) => this.blocked(url))) return Response.json({ error: "Blocked private or local proxy URL" }, { status: 400 });
    try {
      const proxyUrls = provided?.length ? provided : await getProxyCandidates(targetUrl);
      if (!proxyUrls.length) return Response.json({ results: [], message: "No proxy candidates available to test. Configure a proxy first." });
      const results = await testProxiesAgainstTarget(targetUrl, proxyUrls);
      return Response.json({ results, summary: { total: results.length, working: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to test proxy fallback";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  private blocked(rawUrl: string): boolean {
    if (arePrivateProviderUrlsAllowed()) return false;
    try { return isPrivateHost(new URL(rawUrl).hostname); } catch { return true; }
  }
}
