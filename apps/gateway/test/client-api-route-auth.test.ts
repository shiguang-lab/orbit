import assert from "node:assert/strict";
import test from "node:test";

import {
  enforceClientApiRouteAuth,
  type ClientApiRouteAuthDependencies,
} from "../src/common/client-api-route-auth.js";

function dependencies(
  overrides: Partial<ClientApiRouteAuthDependencies> = {},
): ClientApiRouteAuthDependencies {
  return {
    extractApiKey: () => null,
    isValidGatewayApiKey: async (_key, validate) => validate(_key),
    validateApiKey: async () => false,
    isRequireApiKeyEnabled: () => true,
    isDashboardSessionAuthenticated: async () => false,
    ...overrides,
  };
}

const request = new Request("http://localhost/api/v1/images/generations");

test("client API auth accepts a valid gateway key", async () => {
  const result = await enforceClientApiRouteAuth(
    request,
    dependencies({ extractApiKey: () => "valid", validateApiKey: async () => true }),
  );
  assert.equal(result, null);
});

test("client API auth rejects an invalid presented key when enforcement is enabled", async () => {
  const result = await enforceClientApiRouteAuth(
    request,
    dependencies({ extractApiKey: () => "invalid" }),
  );
  assert.equal(result?.status, 401);
  assert.match(await result!.text(), /Invalid API key/);
});

test("client API auth accepts a dashboard session without a key", async () => {
  const result = await enforceClientApiRouteAuth(
    request,
    dependencies({ isDashboardSessionAuthenticated: async () => true }),
  );
  assert.equal(result, null);
});

test("client API auth follows disabled key enforcement for anonymous and stale-key requests", async () => {
  const anonymous = await enforceClientApiRouteAuth(
    request,
    dependencies({ isRequireApiKeyEnabled: () => false }),
  );
  const stale = await enforceClientApiRouteAuth(
    request,
    dependencies({ extractApiKey: () => "stale", isRequireApiKeyEnabled: () => false }),
  );
  assert.equal(anonymous, null);
  assert.equal(stale, null);
});

test("client API auth rejects anonymous requests when enforcement is enabled", async () => {
  const result = await enforceClientApiRouteAuth(request, dependencies());
  assert.equal(result?.status, 401);
  assert.match(await result!.text(), /Authentication required/);
});
