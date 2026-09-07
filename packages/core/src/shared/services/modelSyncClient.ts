import { randomUUID } from "node:crypto";
import { Agent, buildConnector, fetch as undiciFetch, type Dispatcher } from "undici";
import { getRuntimePorts } from "../../lib/runtime/ports.js";

const MODEL_SYNC_INTERNAL_AUTH_HEADER = "x-model-sync-internal-auth";

function normalizeInternalBasePath(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "/") return "";
  if (!trimmed.startsWith("/") || /[?#\\]/.test(trimmed)) return "";

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) return "";
  return `/${segments.join("/")}`;
}

/** Trusted origin for internal API calls. Never derive it from request headers. */
export function getModelSyncInternalBaseUrl(): string {
  return resolveModelSyncInternalBaseUrl();
}

export function resolveModelSyncInternalBaseUrl(_candidate?: string): string {
  const { dashboardPort } = getRuntimePorts();
  const configured =
    process.env.SHIGUANG_GATEWAY_BASE_URL?.trim() || process.env.INTERNAL_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password
      ) {
        return `${url.origin}${normalizeInternalBasePath(url.pathname)}`;
      }
    } catch {
      // Fall through to the loopback default for malformed operator input.
    }
  }
  const nativeTls = process.env.SHIGUANG_GATEWAY_INTERNAL_SCHEME === "https";
  const origin = nativeTls
    ? `https://localhost:${dashboardPort}`
    : `http://127.0.0.1:${dashboardPort}`;
  return `${origin}${normalizeInternalBasePath(process.env.SHIGUANG_GATEWAY_BASE_PATH)}`;
}

export function createPinnedModelSyncTlsConnector(
  connect: buildConnector.connector = buildConnector({ servername: "localhost" })
): buildConnector.connector {
  return (options, callback) =>
    connect(
      {
        ...options,
        host: "localhost",
        hostname: "127.0.0.1",
        servername: "localhost",
      },
      callback
    );
}

let pinnedModelSyncTlsDispatcher: Dispatcher | null = null;

function getPinnedModelSyncTlsDispatcher(): Dispatcher {
  if (!pinnedModelSyncTlsDispatcher) {
    pinnedModelSyncTlsDispatcher = new Agent({
      connect: createPinnedModelSyncTlsConnector(),
      connections: 8,
      pipelining: 0,
    });
  }
  return pinnedModelSyncTlsDispatcher;
}

const fetchWithDispatcher = undiciFetch as unknown as (
  input: RequestInfo | URL,
  init: RequestInit & { dispatcher: Dispatcher }
) => Promise<Response>;

export const fetchModelSyncInternal: typeof fetch = async (input, init = {}) => {
  const inputUrl =
    typeof input === "string" || input instanceof URL ? new URL(input) : new URL(input.url);
  const expectedBase = new URL(getModelSyncInternalBaseUrl());
  if (
    inputUrl.protocol !== expectedBase.protocol ||
    inputUrl.hostname !== expectedBase.hostname ||
    inputUrl.port !== expectedBase.port ||
    inputUrl.username ||
    inputUrl.password
  ) {
    throw new TypeError("model sync internal fetch must target the active dashboard listener");
  }

  const basePath = expectedBase.pathname === "/" ? "" : expectedBase.pathname;
  if (basePath && inputUrl.pathname !== basePath && !inputUrl.pathname.startsWith(`${basePath}/`)) {
    throw new TypeError("model sync internal fetch must stay under the configured base path");
  }

  const requestInit = { ...init, redirect: "error" as const };
  if (inputUrl.protocol === "https:") {
    return fetchWithDispatcher(inputUrl, {
      ...requestInit,
      dispatcher: getPinnedModelSyncTlsDispatcher(),
    });
  }
  return globalThis.fetch(inputUrl.href, requestInit);
};

const globalState = globalThis as typeof globalThis & {
  __shiguangGatewayModelSyncInternalAuthToken?: string;
};

let internalAuthToken: string | null = null;

function getInternalAuthToken(): string {
  if (!internalAuthToken) {
    internalAuthToken = globalState.__shiguangGatewayModelSyncInternalAuthToken || randomUUID();
    globalState.__shiguangGatewayModelSyncInternalAuthToken = internalAuthToken;
  }
  return internalAuthToken;
}

export function getModelSyncInternalAuthHeaderName(): string {
  return MODEL_SYNC_INTERNAL_AUTH_HEADER;
}

export function buildModelSyncInternalHeaders(): Record<string, string> {
  return { [MODEL_SYNC_INTERNAL_AUTH_HEADER]: getInternalAuthToken() };
}

export function isModelSyncInternalRequest(request: { headers: Headers }): boolean {
  if (!internalAuthToken && globalState.__shiguangGatewayModelSyncInternalAuthToken) {
    internalAuthToken = globalState.__shiguangGatewayModelSyncInternalAuthToken;
  }
  const headerToken = request.headers.get(MODEL_SYNC_INTERNAL_AUTH_HEADER);
  return Boolean(headerToken && internalAuthToken && headerToken === internalAuthToken);
}
