import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILTIN_ANTIGRAVITY_CLIENT,
  BUILTIN_GEMINI_CLIENT,
  selectGoogleRefreshClient,
} from "../src/services/tokenRefresh/googleClientBinding.ts";

const configured = {
  clientId: "custom-client.apps.googleusercontent.com",
  clientSecret: "custom-secret",
};

test("unmarked and builtin Google tokens stay bound to their provider builtin client", () => {
  assert.deepEqual(selectGoogleRefreshClient("antigravity", undefined, configured), {
    ...BUILTIN_ANTIGRAVITY_CLIENT,
  });
  assert.deepEqual(selectGoogleRefreshClient("agy", "builtin", configured), {
    ...BUILTIN_ANTIGRAVITY_CLIENT,
  });
  assert.deepEqual(selectGoogleRefreshClient("gemini", undefined, configured), {
    ...BUILTIN_GEMINI_CLIENT,
  });
  assert.notEqual(BUILTIN_GEMINI_CLIENT.clientId, BUILTIN_ANTIGRAVITY_CLIENT.clientId);
});

test("a custom token uses only the exact custom client that issued it", () => {
  assert.deepEqual(
    selectGoogleRefreshClient("antigravity", `custom:${configured.clientId}`, configured),
    configured
  );
  assert.deepEqual(
    selectGoogleRefreshClient("antigravity", "custom:rotated-away", configured),
    { ...BUILTIN_ANTIGRAVITY_CLIENT }
  );
});

test("unknown Google-family providers fail closed", () => {
  assert.throws(
    () => selectGoogleRefreshClient("unknown", undefined, configured),
    /no builtin OAuth client registered/
  );
});
