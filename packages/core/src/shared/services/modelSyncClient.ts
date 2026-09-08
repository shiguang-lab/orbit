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

export function resolveModelSyncInternalBaseUrl(candidate?: string): string {
  if (candidate?.trim()) {
    try {
      const url = new URL(candidate.trim());
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password
      ) {
        return `${url.origin}${normalizeInternalBasePath(url.pathname)}`;
      }
    } catch {
      // Fall through to configured settings
    }
  }

  const configured =
    process.env.CONTROL_API_URL?.trim() ||
    process.env.ORBIT_CONTROL_URL?.trim() ||
    (process.env.APP_NAME === "control" ? process.env.INTERNAL_BASE_URL?.trim() : undefined) ||
    (process.env.APP_NAME === "control"
      ? `http://127.0.0.1:${process.env.CONTROL_API_PORT || 8788}`
      : undefined) ||
    (process.env.APP_NAME === "worker"
      ? process.env.CONTROL_API_URL?.trim() || "http://orbit-control:8788"
      : undefined) ||
    process.env.INTERNAL_BASE_URL?.trim() ||
    process.env.ORBIT_BASE_URL?.trim();
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
  const controlPort = Number.parseInt(process.env.CONTROL_API_PORT || "", 10) || 8788;
  const { dashboardPort } = getRuntimePorts();
  const port = process.env.APP_NAME === "control" ? controlPort : dashboardPort;
  const nativeTls = process.env.ORBIT_INTERNAL_SCHEME === "https";
  const origin = nativeTls
    ? `https://localhost:${port}`
    : `http://127.0.0.1:${port}`;
  return `${origin}${normalizeInternalBasePath(process.env.ORBIT_BASE_PATH)}`;
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

export const fetchModelSyncInternal: typeof fetch = async (input, init: RequestInit = {}) => {
  const inputUrl =
    typeof input === "string" || input instanceof URL ? new URL(input) : new URL(input.url);
  const expectedBase = new URL(getModelSyncInternalBaseUrl());
  const isHostAllowed =
    inputUrl.hostname === expectedBase.hostname ||
    ((inputUrl.hostname === "127.0.0.1" || inputUrl.hostname === "localhost") &&
      (expectedBase.hostname === "127.0.0.1" ||
        expectedBase.hostname === "localhost" ||
        expectedBase.hostname === "orbit-control"));

  if (
    inputUrl.protocol !== expectedBase.protocol ||
    !isHostAllowed ||
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

  const token = getInternalAuthToken();
  const forwardHeaders = new Headers(init.headers as HeadersInit | undefined);
  if (token) {
    if (!forwardHeaders.has(MODEL_SYNC_INTERNAL_AUTH_HEADER)) {
      forwardHeaders.set(MODEL_SYNC_INTERNAL_AUTH_HEADER, token);
    }
    if (!forwardHeaders.has("x-orbit-internal-service-token")) {
      forwardHeaders.set("x-orbit-internal-service-token", token);
    }
  }

  const requestInit = { ...init, headers: forwardHeaders, redirect: "error" as const };
  if (inputUrl.protocol === "https:") {
    return fetchWithDispatcher(inputUrl, {
      ...requestInit,
      dispatcher: getPinnedModelSyncTlsDispatcher(),
    });
  }
  return globalThis.fetch(inputUrl.href, requestInit);
};

const globalState = globalThis as typeof globalThis & {
  __orbitModelSyncInternalAuthToken?: string;
};

let internalAuthToken: string | null = null;

function getInternalAuthToken(): string {
  if (!internalAuthToken) {
    internalAuthToken =
      process.env.ORBIT_INTERNAL_SERVICE_TOKEN?.trim() ||
      process.env.INTERNAL_SERVICE_TOKEN?.trim() ||
      globalState.__orbitModelSyncInternalAuthToken ||
      randomUUID();
    globalState.__orbitModelSyncInternalAuthToken = internalAuthToken;
  }
  return internalAuthToken;
}

export function getModelSyncInternalAuthHeaderName(): string {
  return MODEL_SYNC_INTERNAL_AUTH_HEADER;
}

export function buildModelSyncInternalHeaders(): Record<string, string> {
  const token = getInternalAuthToken();
  return {
    [MODEL_SYNC_INTERNAL_AUTH_HEADER]: token,
    "x-orbit-internal-service-token": token,
  };
}

export function isModelSyncInternalRequest(request: { headers: Headers }): boolean {
  const headerToken =
    request.headers.get(MODEL_SYNC_INTERNAL_AUTH_HEADER) ||
    request.headers.get("x-orbit-internal-service-token");
  if (!headerToken) return false;

  const sharedToken =
    process.env.ORBIT_INTERNAL_SERVICE_TOKEN?.trim() ||
    process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (sharedToken && headerToken === sharedToken) {
    return true;
  }

  if (!internalAuthToken && globalState.__orbitModelSyncInternalAuthToken) {
    internalAuthToken = globalState.__orbitModelSyncInternalAuthToken;
  }
  return Boolean(internalAuthToken && headerToken === internalAuthToken);
}
