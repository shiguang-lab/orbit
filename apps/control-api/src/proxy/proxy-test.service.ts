import { Injectable } from "@nestjs/common";
import { request as undiciRequest } from "undici";
import {
  createProxyDispatcher,
  isRelayType,
  isSocks5ProxyEnabled,
  proxyConfigToUrl,
  proxyUrlForLogs,
} from "@shiguang-gateway/open-sse/utils/proxyDispatcher";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { getProxyById, extractRelayAuth, recordRelayProbe } from "@shiguang-gateway/core-domain/db/local-db";
import { probeEchoTargets } from "@shiguang-gateway/core-domain/shared/proxy-echo-target";
import { testProxySchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { buildRelayTestResult } from "./relay-test-result.js";

const BASE_SUPPORTED_PROXY_TYPES = new Set(["http", "https"]);

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return sanitizeErrorMessage(error) || fallbackMessage;
}

function supportedTypesMessage(): string {
  return isSocks5ProxyEnabled() ? "http, https, or socks5" : "http or https";
}

/** Executes the control-plane proxy connectivity probe. */
@Injectable()
export class ProxyTestService {
  async test(rawBody: unknown) {
    const validation = validateBody(testProxySchema, rawBody);
    if (isValidationFailure(validation)) {
      return { status: 400, body: { error: validation.error.message, type: "invalid_request" } };
    }

    let { proxy } = validation.data;
    const body = rawBody as Record<string, unknown>;
    const proxyId = typeof body.proxyId === "string" ? body.proxyId.trim() : null;
    let dbProxyNotes: string | null = null;
    if (proxyId) {
      const dbProxy = await getProxyById(proxyId, { includeSecrets: true });
      if (dbProxy) {
        proxy = {
          ...proxy,
          host: proxy.host || dbProxy.host,
          port: proxy.port || String(dbProxy.port),
          type: proxy.type || dbProxy.type,
          username: dbProxy.username,
          password: dbProxy.password,
        };
        dbProxyNotes = dbProxy.notes ?? null;
      }
    }

    const proxyType = String(proxy.type || "http").toLowerCase();
    if (isRelayType(proxyType)) return this.testRelay(proxy, dbProxyNotes);
    if (proxyType === "socks5" && !isSocks5ProxyEnabled()) {
      return { status: 400, body: { error: "SOCKS5 proxy is disabled (set ENABLE_SOCKS5_PROXY=true to enable)", type: "invalid_request" } };
    }
    if (proxyType.startsWith("socks") && proxyType !== "socks5") {
      return { status: 400, body: { error: `proxy.type must be ${supportedTypesMessage()}`, type: "invalid_request" } };
    }
    if (!BASE_SUPPORTED_PROXY_TYPES.has(proxyType) && !(proxyType === "socks5" && isSocks5ProxyEnabled())) {
      return { status: 400, body: { error: `proxy.type must be ${supportedTypesMessage()}`, type: "invalid_request" } };
    }

    let proxyUrl: string;
    try {
      const normalizedProxyUrl = proxyConfigToUrl({ type: proxyType, host: proxy.host, port: proxy.port, username: proxy.username || "", password: proxy.password || "" }, { allowSocks5: isSocks5ProxyEnabled() });
      if (!normalizedProxyUrl) return { status: 400, body: { error: "Invalid proxy configuration", type: "invalid_request" } };
      proxyUrl = normalizedProxyUrl;
    } catch (error) {
      return { status: 400, body: { error: getErrorMessage(error, "Invalid proxy configuration"), type: "invalid_request" } };
    }

    const publicProxyUrl = proxyUrlForLogs(proxyUrl);
    const startTime = Date.now();
    const dispatcher = createProxyDispatcher(proxyUrl);
    try {
      const { result: responseText } = await probeEchoTargets(async (url, timeoutMs) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const result = await undiciRequest(url, { method: "GET", dispatcher, signal: controller.signal, headersTimeout: timeoutMs, bodyTimeout: timeoutMs });
          return await result.body.text();
        } finally {
          clearTimeout(timeout);
        }
      }, 10000);
      let parsed: { ip?: string };
      try {
        const parsedJson = JSON.parse(responseText);
        parsed = parsedJson && typeof parsedJson === "object" ? parsedJson as { ip?: string } : { ip: String(parsedJson) };
      } catch {
        parsed = { ip: responseText.trim() };
      }
      return { status: 200, body: { success: true, publicIp: parsed.ip || null, latencyMs: Date.now() - startTime, proxyUrl: publicProxyUrl } };
    } catch (fetchError) {
      const message = fetchError instanceof Error && fetchError.name === "AbortError" ? "Connection timeout (10s)" : getErrorMessage(fetchError, "Connection failed");
      console.warn(`[ProxyTest] ${proxyType} proxy ${publicProxyUrl} failed: ${message}`);
      return { status: 200, body: { success: false, error: message, latencyMs: Date.now() - startTime, proxyUrl: publicProxyUrl } };
    }
  }

  private async testRelay(proxy: { host: string; password?: string }, dbProxyNotes: string | null) {
    const relayHost = proxy.host;
    let relayAuth = extractRelayAuth(dbProxyNotes) ?? "";
    if (!relayAuth) relayAuth = proxy.password ?? "";
    const relayUrl = `https://${relayHost}`;
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await undiciRequest(`${relayUrl}/`, { method: "GET", signal: controller.signal, headersTimeout: 10000, bodyTimeout: 10000, headers: { "x-relay-target": "https://api64.ipify.org", "x-relay-path": "/?format=json", "x-relay-auth": relayAuth } });
      const text = await res.body.text();
      let parsedIp: { ip?: string } = {};
      try { parsedIp = JSON.parse(text) as { ip?: string }; } catch { /* relay may return non-JSON */ }
      const result = buildRelayTestResult({ statusCode: res.statusCode, publicIp: parsedIp.ip || null, latencyMs: Date.now() - start, relayUrl, relayAuthPresent: relayAuth.length > 0, relayResponseHeaders: { get: (name: string) => { const value = res.headers[name.toLowerCase()]; return value === undefined ? null : String(value); } } });
      recordRelayProbe(result.success);
      if (!result.success) console.warn(`[ProxyTest] relay ${relayHost}: ${result.error}`);
      return { status: 200, body: result };
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError" ? "Connection timeout (10s)" : getErrorMessage(error, "Relay test failed");
      console.warn(`[ProxyTest] relay ${relayHost} request failed: ${message}`);
      return { status: 200, body: { success: false, error: message, latencyMs: Date.now() - start, proxyUrl: relayUrl } };
    } finally {
      clearTimeout(timeout);
    }
  }
}
