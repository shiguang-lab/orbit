import { Injectable } from "@nestjs/common";
import { getProviderConnections } from "@shiguang-gateway/core-domain/db/provider-connections";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  providersBatchTestSchema,
  getProviderConnectionFamilyIds,
  AI_PROVIDERS,
  NOAUTH_PROVIDERS,
  OAUTH_PROVIDERS,
  APIKEY_PROVIDERS,
  LOCAL_PROVIDERS,
  UPSTREAM_PROXY_PROVIDERS,
  WEB_COOKIE_PROVIDERS,
  SEARCH_PROVIDERS,
  AUDIO_ONLY_PROVIDERS,
  CLOUD_AGENT_PROVIDERS,
  IDE_PROVIDER_IDS,
  OPENAI_COMPATIBLE_PREFIX,
  ANTHROPIC_COMPATIBLE_PREFIX,
} from "@shiguang-gateway/core-domain/control/provider-test-batch";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { testSingleConnection } from "./handlers/provider-test/provider-test.handler.js";

@Injectable()
export class ProviderTestBatchService {
  async test(rawBody: unknown) {
    const validation = validateBody(providersBatchTestSchema, rawBody);
    if (isValidationFailure(validation)) return { status: 400, body: { error: validation.error } };
    const { mode, providerId, connectionIds } = validation.data;
    const all = await getProviderConnections(mode === "selected" ? undefined : { isActive: true });
    const group = (id: string) =>
      NOAUTH_PROVIDERS[id]
        ? "no-auth"
        : OAUTH_PROVIDERS[id]
          ? "oauth"
          : WEB_COOKIE_PROVIDERS[id]
            ? "web-cookie"
            : SEARCH_PROVIDERS[id]
              ? "search"
              : AUDIO_ONLY_PROVIDERS[id]
                ? "audio"
                : LOCAL_PROVIDERS[id]
                  ? "local"
                  : UPSTREAM_PROXY_PROVIDERS[id]
                    ? "upstream-proxy"
                    : CLOUD_AGENT_PROVIDERS[id]
                      ? "cloud-agent"
                      : APIKEY_PROVIDERS[id]
                        ? "apikey"
                        : "unknown";
    const compatible = (id: string) => id.startsWith(OPENAI_COMPATIBLE_PREFIX) || id.startsWith(ANTHROPIC_COMPATIBLE_PREFIX);
    let selected = all;
    if (mode === "selected") selected = all.filter((c) => new Set(connectionIds || []).has(String(c.id ?? "")));
    else if (mode === "provider" && providerId) {
      const ids = new Set(getProviderConnectionFamilyIds(providerId));
      selected = all.filter((c) => ids.has(String(c.provider ?? "")));
    } else if (["oauth", "no-auth", "apikey", "web-cookie", "search", "audio", "local", "upstream-proxy", "cloud-agent"].includes(mode)) {
      selected = all.filter((c) => group(String(c.provider ?? "")) === mode);
    } else if (mode === "free") selected = all.filter((c) => AI_PROVIDERS[String(c.provider ?? "")]?.hasFree === true);
    else if (mode === "ide") selected = all.filter((c) => IDE_PROVIDER_IDS.has(String(c.provider ?? "")));
    else if (mode === "compatible") selected = all.filter((c) => compatible(String(c.provider ?? "")));
    else if (mode !== "all") return { status: 400, body: { error: "Invalid mode" } };
    const results = [];
    for (let i = 0; i < selected.length; i += 5) {
      const batch = selected.slice(i, i + 5);
      results.push(
        ...(await Promise.all(
          batch.map(async (c) => {
            const provider = String(c.provider ?? "");
            const connectionId = String(c.id ?? "");
            try {
              const d = (await Promise.race([
                testSingleConnection(connectionId),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Connection test timed out after 30s")), 30000)),
              ])) as {
                valid: boolean;
                latencyMs?: number;
                error?: string | null;
                diagnosis?: unknown;
                statusCode?: number | null;
                testedAt?: string;
              };
              return {
                provider,
                connectionId,
                connectionName: String(c.name || c.email || provider),
                authType: String(c.authType || group(provider)),
                valid: d.valid,
                latencyMs: d.latencyMs || 0,
                error: d.error || null,
                diagnosis: d.diagnosis || null,
                statusCode: d.statusCode || null,
                testedAt: d.testedAt || new Date().toISOString(),
              };
            } catch (e) {
              const message = sanitizeErrorMessage(e);
              return {
                provider,
                connectionId,
                connectionName: String(c.name || c.email || provider),
                authType: String(c.authType || group(provider)),
                valid: false,
                latencyMs: 0,
                error: message,
                diagnosis: { type: "network_error", source: "local", code: null, message },
                statusCode: null,
                testedAt: new Date().toISOString(),
              };
            }
          }),
        )),
      );
    }
    return { status: 200, body: { mode, providerId: providerId || null, results, testedAt: new Date().toISOString(), summary: { total: results.length, passed: results.filter(r => r.valid).length, failed: results.filter(r => !r.valid).length } } };
  }
}
