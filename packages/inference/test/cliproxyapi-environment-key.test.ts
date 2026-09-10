import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCliproxyapiCredentials,
  resolveDedicatedCliproxyapiApiKey,
} from "../src/handlers/chatCore/cliproxyapiCredentials.ts";

const original = process.env.CLIPROXYAPI_API_KEY;

test.afterEach(() => {
  if (original === undefined) delete process.env.CLIPROXYAPI_API_KEY;
  else process.env.CLIPROXYAPI_API_KEY = original;
});

test("environment supplies a trimmed CLIProxyAPI data-plane key", () => {
  process.env.CLIPROXYAPI_API_KEY = "  cpa-env-key  ";
  assert.equal(resolveDedicatedCliproxyapiApiKey(null), "cpa-env-key");
  assert.equal(resolveDedicatedCliproxyapiApiKey({ cliproxyapi_api_key: "" }), "cpa-env-key");
});

test("persisted setting takes precedence over the environment", () => {
  process.env.CLIPROXYAPI_API_KEY = "cpa-env-key";
  assert.equal(
    resolveDedicatedCliproxyapiApiKey({ cliproxyapi_api_key: "  cpa-setting-key  " }),
    "cpa-setting-key"
  );
});

test("resolved dedicated key replaces only the CLIProxyAPI-bound credentials", () => {
  const originalCredentials = { apiKey: "native-key", accessToken: "native-token" };
  assert.deepEqual(resolveCliproxyapiCredentials(originalCredentials, "cpa-key"), {
    apiKey: "cpa-key",
    accessToken: undefined,
  });
  assert.equal(resolveCliproxyapiCredentials(originalCredentials, null), originalCredentials);
});
