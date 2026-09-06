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
import * as settings from "@shiguang-gateway/core-domain/control/settings";
import * as proxies from "@shiguang-gateway/core-domain/db/proxies";
import * as mitmAliases from "@shiguang-gateway/core-domain/db/mitm-aliases";
import * as hiddenModels from "@shiguang-gateway/core-domain/db/hidden-models";
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
