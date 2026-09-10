import assert from "node:assert/strict";
import test from "node:test";
import { isMatchingOauthIdentity } from "../src/lib/db/webSessionDedup.ts";
import { findExistingOAuthConnectionMatch } from "../src/lib/oauth/connectionPersistence.ts";

test("Claude personal and Team organizations sharing an email stay separate", () => {
  const existing = [{
    id: "personal",
    email: "same@example.com",
    authType: "oauth",
    providerSpecificData: { accountUUID: "account", organizationUUID: "org-personal" },
  }];
  const match = findExistingOAuthConnectionMatch(existing, "claude", {
    email: "same@example.com",
    providerSpecificData: { accountUUID: "account", organizationUUID: "org-team" },
  });
  assert.equal(match, undefined);
});

test("same Claude organization and legacy rows still deduplicate", () => {
  const row = { provider_specific_data: JSON.stringify({ organizationUUID: "org-one" }) };
  assert.equal(isMatchingOauthIdentity(row, null, null, "org-one"), true);
  assert.equal(isMatchingOauthIdentity(row, null, null, "org-two"), false);
  assert.equal(isMatchingOauthIdentity({ provider_specific_data: "{}" }, null, null, "org-one"), true);
});
