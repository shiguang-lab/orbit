import type {
  CodexImportRefreshValidationResult,
  ProviderCredentialRefreshResult,
} from "@shiguang-gateway/contracts/edge-runtime-command";
import { getProviderConnectionById, updateProviderConnection } from "@shiguang-gateway/core-domain/db/provider-connections";
import {
  getAccessToken,
  resolveCopilotTokenBaseUrl,
  updateProviderCredentials,
} from "@shiguang-gateway/open-sse/services/credentialTokenRefresh";
import { refreshCopilotToken } from "@shiguang-gateway/open-sse/services/token-refresh";
import { rotationGroupFor } from "@shiguang-gateway/open-sse/services/refreshSerializer";
import { parseKimiJwt } from "@shiguang-gateway/open-sse/utils/kimiJwt";

type RefreshPurpose = "manual" | "connection-test" | "kimi-manual";
type Connection = Record<string, any>;
type RefreshCredentials = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  expiresIn?: number;
  error?: string;
  code?: string;
  reason?: string;
  migrateTo?: string;
};

export interface ProviderCredentialRefreshDependencies {
  loadConnection(id: string): Promise<Connection | null>;
  persistConnection(id: string, updates: Record<string, unknown>): Promise<unknown>;
  persistCredentials(id: string, credentials: RefreshCredentials): Promise<unknown>;
  refresh(provider: string, credentials: Connection, onPersist: (result: RefreshCredentials) => Promise<void>): Promise<RefreshCredentials | null>;
  refreshCopilot(accessToken: string, credentials: Connection, baseUrl?: string): Promise<{ token?: string; expiresAt?: string | number } | null>;
  copilotBaseUrl(provider: string, credentials: Connection): string | undefined;
  rotationGroup(provider: string): string | null;
  parseKimiAccessToken(accessToken: string): Record<string, any> | null;
}

const defaultDependencies: ProviderCredentialRefreshDependencies = {
  loadConnection: (id) => getProviderConnectionById(id) as Promise<Connection | null>,
  persistConnection: updateProviderConnection,
  persistCredentials: updateProviderCredentials,
  refresh: (provider, credentials, onPersist) => getAccessToken(provider, credentials, onPersist),
  refreshCopilot: (accessToken, credentials, baseUrl) =>
    refreshCopilotToken(accessToken, credentials, baseUrl),
  copilotBaseUrl: resolveCopilotTokenBaseUrl,
  rotationGroup: rotationGroupFor,
  parseKimiAccessToken: parseKimiJwt,
};

function expiryIso(credentials: RefreshCredentials): string | undefined {
  if (credentials.expiresAt) return credentials.expiresAt;
  if (credentials.expiresIn) {
    return new Date(Date.now() + credentials.expiresIn * 1000).toISOString();
  }
  return undefined;
}

function withStableExpiry(credentials: RefreshCredentials): RefreshCredentials {
  if (credentials.expiresAt || credentials.expiresIn) return credentials;
  return {
    ...credentials,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export async function validateCodexImportRefreshToken(
  accessToken: string,
  refreshToken: string,
): Promise<CodexImportRefreshValidationResult> {
  try {
    const result = await getAccessToken("codex", { accessToken, refreshToken });
    if (!result) return { outcome: "inconclusive" };
    if (
      result.error === "unrecoverable_refresh_error" ||
      result.error === "refresh_token_reused" ||
      result.error === "invalid_grant"
    ) {
      return { outcome: "expired" };
    }
    if (typeof result.accessToken !== "string" || !result.accessToken) {
      return { outcome: "inconclusive" };
    }
    return {
      outcome: "valid",
      accessToken: result.accessToken,
      refreshToken:
        typeof result.refreshToken === "string" && result.refreshToken
          ? result.refreshToken
          : refreshToken,
    };
  } catch {
    return { outcome: "inconclusive" };
  }
}

export async function refreshProviderConnectionCredentials(
  connectionId: string,
  purpose: RefreshPurpose,
  dependencies: ProviderCredentialRefreshDependencies = defaultDependencies,
): Promise<ProviderCredentialRefreshResult> {
  const connection = await dependencies.loadConnection(connectionId);
  if (!connection) return { outcome: "not-found" };

  const provider = typeof connection.provider === "string" ? connection.provider : "";
  if (!provider) return { outcome: "invalid", status: 422, error: "Connection provider is invalid" };
  if (purpose !== "kimi-manual" && connection.authType !== "oauth") {
    return { outcome: "invalid", status: 400, error: "Only OAuth connections support manual token refresh" };
  }
  if (purpose === "kimi-manual" && provider !== "kimi-web" && provider !== "kimi_web") {
    return {
      outcome: "invalid",
      status: 400,
      error: `Manual token refresh not supported for provider ${provider}`,
    };
  }
  const providerData = connection.providerSpecificData as Record<string, unknown> | undefined;
  const storedRefreshToken =
    (typeof connection.refreshToken === "string" && connection.refreshToken) ||
    ((provider === "kimi-web" || provider === "kimi_web") &&
    typeof providerData?.refreshToken === "string"
      ? providerData.refreshToken
      : "");
  if (!storedRefreshToken && !connection.accessToken) {
    return { outcome: "invalid", status: 422, error: "No token credentials available for refresh" };
  }

  const rotationGroup = dependencies.rotationGroup(provider);
  if (
    (purpose === "connection-test" && rotationGroup !== null) ||
    (purpose === "manual" && rotationGroup === "openai-auth0")
  ) {
    return {
      outcome: "skipped",
      connectionId,
      provider,
      expiresAt: connection.tokenExpiresAt || connection.expiresAt || null,
      message:
        "Rotating-refresh provider: the token refreshes automatically on the next request. " +
        "Manual/bulk refresh is intentionally skipped to avoid token-family revocation.",
    };
  }

  const credentials: Connection = {
    connectionId,
    provider,
    accessToken: connection.accessToken,
    refreshToken: storedRefreshToken,
    expiresAt: connection.expiresAt,
    expiresIn: connection.expiresIn,
    idToken: connection.idToken,
    providerSpecificData: connection.providerSpecificData,
  };

  if (
    (provider === "github" || provider === "ghe-copilot") &&
    !connection.refreshToken &&
    typeof connection.accessToken === "string" &&
    connection.accessToken
  ) {
    const result = await dependencies.refreshCopilot(
      connection.accessToken,
      credentials,
      dependencies.copilotBaseUrl(provider, credentials),
    );
    if (!result?.token) return { outcome: "failed", error: "Token refresh failed — provider returned no new token" };
    const providerSpecificData = {
      ...(connection.providerSpecificData || {}),
      copilotToken: result.token,
      copilotTokenExpiresAt: result.expiresAt,
    };
    await dependencies.persistConnection(connectionId, {
      providerSpecificData,
      testStatus: "active",
      lastError: null,
      lastErrorAt: null,
      lastErrorType: null,
      lastErrorSource: null,
      errorCode: null,
    });
    const expiresAtMs =
      typeof result.expiresAt === "number" && result.expiresAt < 1e12
        ? result.expiresAt * 1000
        : typeof result.expiresAt === "string"
          ? new Date(result.expiresAt).getTime()
          : result.expiresAt;
    return {
      outcome: "refreshed",
      connectionId,
      provider,
      expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
      credentials: { accessToken: connection.accessToken },
    };
  }

  if (!storedRefreshToken) {
    return { outcome: "invalid", status: 422, error: "No refresh token available" };
  }

  let persisted: RefreshCredentials | null = null;
  const refreshed = await dependencies.refresh(provider, credentials, async (result) => {
    const stable = withStableExpiry(result);
    const saved = await dependencies.persistCredentials(connectionId, stable);
    if (saved === false) throw new Error("Failed to persist refreshed provider credentials");
    persisted = stable;
  });

  if (refreshed?.error) {
    if (["unrecoverable_refresh_error", "refresh_token_reused", "invalid_grant"].includes(refreshed.error)) {
      const deprecated = refreshed.code === "provider_deprecated";
      const reason = deprecated && refreshed.reason
        ? refreshed.reason
        : "Refresh token expired. Please re-authenticate this account.";
      await dependencies.persistConnection(connectionId, {
        testStatus: deprecated ? "expired" : "invalid",
        lastError: reason,
        ...(deprecated ? { lastErrorType: "provider_deprecated", errorCode: "provider_deprecated" } : {}),
      });
      return {
        outcome: "reauth-required",
        error: deprecated
          ? "This provider was deprecated and can no longer be refreshed"
          : "Token refresh failed — provider returned no new token",
        ...(deprecated ? { deprecated: true, migrateTo: refreshed.migrateTo } : {}),
      };
    }
    return { outcome: "failed", error: "Token refresh failed — provider returned no new token" };
  }
  if (!refreshed?.accessToken) {
    return { outcome: "failed", error: "Token refresh failed — provider returned no new token" };
  }
  if (!persisted) {
    persisted = withStableExpiry(refreshed);
    const saved = await dependencies.persistCredentials(connectionId, persisted);
    if (saved === false) throw new Error("Failed to persist refreshed provider credentials");
  }

  const resolved = persisted || refreshed;
  const expiresAt = expiryIso(resolved);
  const parsedKimi = provider === "kimi-web" || provider === "kimi_web"
    ? dependencies.parseKimiAccessToken(resolved.accessToken!)
    : null;
  return {
    outcome: "refreshed",
    connectionId,
    provider,
    expiresAt: expiresAt ?? null,
    credentials: {
      accessToken: resolved.accessToken!,
      ...(resolved.refreshToken ? { refreshToken: resolved.refreshToken } : {}),
      ...(resolved.expiresAt ? { expiresAt: resolved.expiresAt } : {}),
      ...(resolved.expiresIn ? { expiresIn: resolved.expiresIn } : {}),
    },
    ...(parsedKimi ? {
      user: {
        userId: parsedKimi.sub || null,
        region: parsedKimi.region || null,
        spaceId: parsedKimi.space_id || null,
      },
    } : {}),
  };
}
