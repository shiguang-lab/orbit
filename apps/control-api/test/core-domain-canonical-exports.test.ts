import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrCreateApiKey,
  resolveApiKey,
} from "@orbit/core/shared/api-key-resolver";
import {
  formatValidationMessage,
  isValidationFailure,
  validateBody,
  validatedJsonBody,
} from "@orbit/core/shared/validation/helpers";
import * as oauthPersistence from "@orbit/core/control/oauth-persistence";
import * as providerConnections from "@orbit/core/db/provider-connections";
import * as modelAliases from "@orbit/core/db/model-aliases";
import * as apiKeys from "@orbit/core/db/api-keys";
import * as settings from "@orbit/core/db/settings";
import * as proxies from "@orbit/core/db/proxies";
import * as mitmAliases from "@orbit/core/db/mitm-aliases";
import * as hiddenModels from "@orbit/core/db/hidden-models";
import {
  MAX_PROVIDER_SPECIFIC_TIMEOUT_MS,
  isValidGheUrl,
} from "@orbit/core/shared/provider-specific-data";
import * as providerSpecificData from "@orbit/core/shared/provider-specific-data";
import {
  ALWAYS_PROTECTED_API_PATHS,
  LOCAL_ONLY_API_PREFIXES,
  isAlwaysProtectedPath,
  isLoopbackHost,
} from "@orbit/core/shared/authz-route-policy";
import * as authzRoutePolicy from "@orbit/core/shared/authz-route-policy";
import * as apiKeyPolicy from "@orbit/core/runtime/api-key-policy";
import * as upstreamError from "@orbit/core/shared/upstream-error";
import * as requestId from "@orbit/core/runtime/request-id";
import * as credentialHealth from "@orbit/core/resilience/credential-health-cache";
import * as modelLockout from "@orbit/core/resilience/model-lockout-settings";
import * as cors from "@orbit/core/shared/cors";
import { z } from "zod";

test("resolves the canonical API-key resolver export", async () => {
  assert.equal(typeof getOrCreateApiKey, "function");
  assert.equal(await resolveApiKey(undefined, "sk-explicit"), "sk-explicit");
});

test("resolves the canonical validation helpers export", () => {
  const schema = z.object({ name: z.string() }).strict();
  assert.deepEqual(validateBody(schema, { name: "orbiot" }), {
    success: true,
    data: { name: "orbiot" },
  });

  const failure = validateBody(schema, { name: 42 });
  assert.equal(isValidationFailure(failure), true);
  if (isValidationFailure(failure)) {
    assert.equal(formatValidationMessage(failure.error), "name: Invalid input: expected string, received number");
  }
  assert.equal(typeof validatedJsonBody, "function");
});

test("resolves the narrow model persistence contracts", () => {
  assert.equal(typeof oauthPersistence.createProviderConnection, "function");
  assert.equal(typeof providerConnections.updateProviderConnection, "function");
  assert.equal(typeof modelAliases.getModelAliases, "function");
  assert.equal(typeof apiKeys.validateApiKey, "function");
  assert.equal(typeof settings.isCloudEnabled, "function");
  assert.equal(typeof proxies.resolveProxyForProvider, "function");
  assert.equal(typeof mitmAliases.getMitmAlias, "function");
  assert.equal(typeof mitmAliases.setMitmAliasAll, "function");
  assert.equal(typeof hiddenModels.getHiddenModelsByProvider, "function");
});

test("resolves the canonical provider-data and authz route contracts", () => {
  assert.deepEqual(Object.keys(providerSpecificData).sort(), [
    "MAX_PROVIDER_SPECIFIC_TIMEOUT_MS",
    "isValidGheUrl",
    "validateProviderSpecificData",
  ]);
  assert.equal(MAX_PROVIDER_SPECIFIC_TIMEOUT_MS, 86_400_000);
  assert.equal(isValidGheUrl("https://github.example.com"), true);
  assert.equal(isValidGheUrl("http://github.example.com"), false);

  assert.equal(isLoopbackHost("127.0.0.1:3000"), true);
  assert.equal(isLoopbackHost("example.com"), false);
  assert.equal(LOCAL_ONLY_API_PREFIXES.includes("/api/mcp/"), true);
  assert.equal(ALWAYS_PROTECTED_API_PATHS.includes("/api/shutdown"), false);
  assert.equal(isAlwaysProtectedPath("/api/shutdown"), false);
  assert.deepEqual(Object.keys(authzRoutePolicy).sort(), [
    "ALWAYS_PROTECTED_API_PATHS",
    "LOCAL_ONLY_API_GET_EXEMPTIONS",
    "LOCAL_ONLY_API_PATTERNS",
    "LOCAL_ONLY_API_PREFIXES",
    "LOCAL_ONLY_MANAGE_SCOPE_BYPASS_PREFIXES",
    "SPAWN_CAPABLE_PATTERNS",
    "SPAWN_CAPABLE_PREFIXES",
    "classifyHostLocality",
    "isAlwaysProtectedPath",
    "isLocalOnlyBypassableByManageScope",
    "isLocalOnlyPath",
    "isLoopbackHost",
    "isPrivateLanHost",
  ]);
});

test("resolves the canonical shared and runtime utility contracts", () => {
  assert.deepEqual(Object.keys(apiKeyPolicy).sort(), [
    "enforceApiKeyPolicy",
    "validateApiKeyRoutingTarget",
  ]);
  assert.deepEqual(Object.keys(upstreamError).sort(), [
    "describeUpstreamFailure",
    "extractErrorMessage",
    "toJsonErrorPayload",
  ]);
  assert.deepEqual(Object.keys(requestId).sort(), [
    "addRequestIdHeader",
    "attachRequestIdToResponse",
    "generateRequestId",
    "getRequestId",
    "withRequestId",
  ]);
  assert.deepEqual(Object.keys(credentialHealth).sort(), [
    "getAllCredentialHealth",
    "getCredentialHealth",
    "getCredentialHealthSummary",
    "initCredentialCache",
    "isCredentialHealthy",
    "isCredentialStale",
    "removeCredentialHealth",
    "setCredentialHealth",
  ]);
  assert.deepEqual(Object.keys(modelLockout).sort(), [
    "DEFAULT_MODEL_LOCKOUT_SETTINGS",
    "resolveModelLockoutSettings",
  ]);
  assert.deepEqual(Object.keys(cors).sort(), ["CORS_HEADERS", "handleCorsOptions"]);
});
