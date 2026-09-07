import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { edgeRuntimeCommandSchema } from "@orbit/contracts/edge-runtime-command";
import {
  refreshProviderConnectionCredentials,
  type ProviderCredentialRefreshDependencies,
} from "../src/runtime-control/provider-credential-refresh.js";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

function dependencies(
  overrides: Partial<ProviderCredentialRefreshDependencies> = {},
): ProviderCredentialRefreshDependencies {
  return {
    loadConnection: async () => ({
      id: "connection-1",
      provider: "gemini",
      authType: "oauth",
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: "2020-01-01T00:00:00.000Z",
      providerSpecificData: {},
    }),
    persistConnection: async () => true,
    persistCredentials: async () => true,
    refresh: async (_provider, _credentials, onPersist) => {
      const refreshed = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 3600,
      };
      await onPersist(refreshed);
      return refreshed;
    },
    refreshCopilot: async () => null,
    copilotBaseUrl: () => undefined,
    rotationGroup: () => null,
    parseKimiAccessToken: () => null,
    ...overrides,
  };
}

test("provider credential refresh command is versioned and accepts only a connection identity", () => {
  const parsed = edgeRuntimeCommandSchema.parse({
    version: 1,
    command: "provider-credentials.refresh",
    connectionId: "connection-1",
    purpose: "connection-test",
    refreshToken: "must-not-cross-the-command-boundary",
  });
  assert.deepEqual(parsed, {
    version: 1,
    command: "provider-credentials.refresh",
    connectionId: "connection-1",
    purpose: "connection-test",
  });
  assert.equal(edgeRuntimeCommandSchema.safeParse({
    version: 1,
    command: "codex-import.validate-refresh-token",
    accessToken: "access",
    refreshToken: "refresh",
  }).success, true);
});

test("edge refresh persists rotated credentials before returning them", async () => {
  const events: string[] = [];
  const result = await refreshProviderConnectionCredentials(
    "connection-1",
    "manual",
    dependencies({
      persistCredentials: async (_id, credentials) => {
        events.push(`persist:${credentials.refreshToken}`);
        return true;
      },
      refresh: async (_provider, _credentials, onPersist) => {
        const refreshed = { accessToken: "new-access", refreshToken: "new-refresh", expiresIn: 3600 };
        await onPersist(refreshed);
        events.push("network-complete");
        return refreshed;
      },
    }),
  );

  assert.deepEqual(events, ["persist:new-refresh", "network-complete"]);
  assert.equal(result.outcome, "refreshed");
  if (result.outcome === "refreshed") {
    assert.equal(result.credentials.accessToken, "new-access");
    assert.equal(result.credentials.refreshToken, "new-refresh");
  }
});

test("connection tests do not consume rotating refresh tokens", async () => {
  let refreshCalls = 0;
  const result = await refreshProviderConnectionCredentials(
    "connection-1",
    "connection-test",
    dependencies({
      rotationGroup: () => "openai-auth0",
      refresh: async () => {
        refreshCalls += 1;
        return null;
      },
    }),
  );
  assert.equal(result.outcome, "skipped");
  assert.equal(refreshCalls, 0);
});

test("unrecoverable refresh results are persisted and mapped to reauthentication", async () => {
  let terminalUpdate: Record<string, unknown> | null = null;
  const result = await refreshProviderConnectionCredentials(
    "connection-1",
    "manual",
    dependencies({
      persistConnection: async (_id, updates) => {
        terminalUpdate = updates;
        return true;
      },
      refresh: async () => ({
        error: "unrecoverable_refresh_error",
        code: "invalid_grant",
      }),
    }),
  );
  assert.equal(result.outcome, "reauth-required");
  assert.equal(terminalUpdate?.testStatus, "invalid");
});

test("Kimi manual refresh accepts its legacy provider-data refresh token", async () => {
  let presentedRefreshToken: unknown;
  const result = await refreshProviderConnectionCredentials(
    "connection-1",
    "kimi-manual",
    dependencies({
      loadConnection: async () => ({
        id: "connection-1",
        provider: "kimi-web",
        authType: "api_key",
        accessToken: "old-access",
        providerSpecificData: { refreshToken: "legacy-refresh" },
      }),
      refresh: async (_provider, credentials, onPersist) => {
        presentedRefreshToken = credentials.refreshToken;
        const refreshed = { accessToken: "new-access", refreshToken: "new-refresh", expiresIn: 900 };
        await onPersist(refreshed);
        return refreshed;
      },
    }),
  );
  assert.equal(result.outcome, "refreshed");
  assert.equal(presentedRefreshToken, "legacy-refresh");
});

test("control persisted-connection flows only map the edge command response", () => {
  for (const path of [
    "apps/control/src/providers/handlers/provider-refresh.handler.ts",
    "apps/control/src/providers/handlers/provider-refresh-token.ts",
    "apps/control/src/providers/handlers/provider-test/provider-test.handler.ts",
  ]) {
    const source = read(path);
    assert.match(source, /command: "provider-credentials\.refresh"/, path);
    assert.doesNotMatch(
      source,
      /inference\/services\/(?:token-refresh|credentialTokenRefresh|kimiTokenRefresh)/,
      path,
    );
  }
  const codexImport = read("apps/control/src/oauth/handlers/codex/import/handler.ts");
  assert.match(codexImport, /command: "codex-import\.validate-refresh-token"/);
  assert.doesNotMatch(codexImport, /inference\/services\/token-refresh/);
  const edge = read("apps/gateway/src/runtime-control/provider-credential-refresh.ts");
  assert.match(edge, /getAccessToken/);
  assert.match(edge, /persistCredentials/);
  const kimiExecutor = read("packages/inference/src/executors/kimi-web.ts");
  assert.match(kimiExecutor, /getAccessToken\("kimi-web"/);
  assert.doesNotMatch(kimiExecutor, /exchangeKimiRefreshToken/);
});
