import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrCreateApiKey,
  resolveApiKey,
} from "@shiguang-gateway/core-domain/shared/api-key-resolver";
import {
  formatValidationMessage,
  isValidationFailure,
  validateBody,
  validatedJsonBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import * as oauthPersistence from "@shiguang-gateway/core-domain/control/oauth-persistence";
import * as providerConnections from "@shiguang-gateway/core-domain/db/provider-connections";
import * as modelAliases from "@shiguang-gateway/core-domain/db/model-aliases";
import * as apiKeys from "@shiguang-gateway/core-domain/db/api-keys";
import * as settings from "@shiguang-gateway/core-domain/db/settings";
import * as proxies from "@shiguang-gateway/core-domain/db/proxies";
import * as mitmAliases from "@shiguang-gateway/core-domain/db/mitm-aliases";
import * as hiddenModels from "@shiguang-gateway/core-domain/db/hidden-models";
import {
  MAX_PROVIDER_SPECIFIC_TIMEOUT_MS,
  isValidGheUrl,
} from "@shiguang-gateway/core-domain/shared/provider-specific-data";
import * as providerSpecificData from "@shiguang-gateway/core-domain/shared/provider-specific-data";
import {
  ALWAYS_PROTECTED_API_PATHS,
  LOCAL_ONLY_API_PREFIXES,
  isAlwaysProtectedPath,
  isLoopbackHost,
} from "@shiguang-gateway/core-domain/shared/authz-route-policy";
import * as authzRoutePolicy from "@shiguang-gateway/core-domain/shared/authz-route-policy";
import * as apiKeyPolicy from "@shiguang-gateway/core-domain/runtime/api-key-policy";
import * as upstreamError from "@shiguang-gateway/core-domain/shared/upstream-error";
import * as requestId from "@shiguang-gateway/core-domain/runtime/request-id";
import * as credentialHealth from "@shiguang-gateway/core-domain/resilience/credential-health-cache";
import * as modelLockout from "@shiguang-gateway/core-domain/resilience/model-lockout-settings";
import * as cors from "@shiguang-gateway/core-domain/shared/cors";
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
  assert.equal(ALWAYS_PROTECTED_API_PATHS.includes("/api/shutdown"), true);
  assert.equal(isAlwaysProtectedPath("/api/shutdown"), true);
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
