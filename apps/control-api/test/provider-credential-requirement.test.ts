import assert from "node:assert/strict";
import test from "node:test";
import {
  checkKeylessCatalogConsistency,
  getCredentialRequirement,
  listNoCredentialProviders,
  NOT_TOKEN_QUANTIFIABLE_BUT_CREDENTIALED,
  worksWithoutCredential,
} from "../src/free-tier/provider-credential-requirement.js";

test("preserves credential requirement precedence across anonymous, no-auth, OAuth, and unknown providers", () => {
  assert.equal(getCredentialRequirement("aihorde"), "optional");
  assert.equal(getCredentialRequirement("opencode"), "none");
  assert.equal(getCredentialRequirement("claude"), "oauth");
  assert.equal(getCredentialRequirement("not-a-provider"), "required");
  assert.equal(worksWithoutCredential("none"), true);
  assert.equal(worksWithoutCredential("optional"), true);
  assert.equal(worksWithoutCredential("oauth"), false);
  assert.equal(worksWithoutCredential("required"), false);
});

test("returns a stable sorted list of providers that work without configured credentials", () => {
  const providers = listNoCredentialProviders();
  assert.deepEqual(providers, [...providers].sort());
  assert.equal(new Set(providers).size, providers.length);
  assert.equal(providers.includes("aihorde"), true);
  assert.equal(providers.includes("opencode"), true);
  assert.equal(providers.includes("claude"), false);
});

test("keeps the measured keyless-versus-credential consistency baseline", () => {
  const catalog = NOT_TOKEN_QUANTIFIABLE_BUT_CREDENTIALED.map((provider) => ({
    provider,
    freeType: "keyless",
  }));
  assert.deepEqual(checkKeylessCatalogConsistency(catalog), { unexpected: [], stale: [] });

  assert.deepEqual(
    checkKeylessCatalogConsistency([...catalog, { provider: "claude", freeType: "keyless" }]),
    { unexpected: ["claude"], stale: [] },
  );
});
