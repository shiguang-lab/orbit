import assert from "node:assert/strict";
import { test } from "node:test";
import { findKiroConnectionByIdentity } from "../src/oauth/handlers/kiro/connection-identity.js";

test("does not treat a shared profile ARN as an account identity", () => {
  const connections = [
    {
      id: "google-account",
      authType: "oauth",
      email: "google@example.com",
      providerSpecificData: { profileArn: "arn:aws:codewhisperer:profile/shared" },
    },
    {
      id: "github-account",
      authType: "oauth",
      email: "github@example.com",
      providerSpecificData: { profileArn: "arn:aws:codewhisperer:profile/shared" },
    },
  ];

  assert.equal(findKiroConnectionByIdentity(connections, {
    authType: "oauth",
    profileArn: "arn:aws:codewhisperer:profile/shared",
  }), null);
  assert.equal(findKiroConnectionByIdentity(connections, {
    authType: "oauth",
    profileArn: "arn:aws:codewhisperer:profile/shared",
    email: "new-account@example.com",
  }), null);
  assert.equal(findKiroConnectionByIdentity(connections, {
    authType: "oauth",
    profileArn: "arn:aws:codewhisperer:profile/shared",
    email: "github@example.com",
  })?.id, "github-account");
});

test("accepts an ARN match only with a non-contradicting account identifier", () => {
  const connection = {
    id: "existing",
    authType: "oauth",
    email: "owner@example.com",
    providerSpecificData: {
      profileArn: "profile-arn",
      clientId: "client-1",
    },
  };

  assert.strictEqual(findKiroConnectionByIdentity([connection], {
    authType: "oauth",
    profileArn: " profile-arn ",
    email: " OWNER@example.com ",
    clientId: "client-1",
  }), connection);
  assert.equal(findKiroConnectionByIdentity([connection], {
    authType: "oauth",
    profileArn: "profile-arn",
    email: "other@example.com",
    clientId: "other-client",
  }), null);
});

test("uses clientId before email and email before name", () => {
  const byName = {
    id: "name-match",
    authType: "oauth",
    name: "Shared Name",
    email: "name@example.com",
    providerSpecificData: { clientId: "name-client" },
  };
  const byEmail = {
    id: "email-match",
    authType: "oauth",
    name: "Other",
    email: "shared@example.com",
    providerSpecificData: { clientId: "email-client" },
  };
  const byClient = {
    id: "client-match",
    authType: "oauth",
    name: "Third",
    email: "client@example.com",
    providerSpecificData: { clientId: "target-client" },
  };
  const connections = [byName, byEmail, byClient];

  assert.strictEqual(findKiroConnectionByIdentity(connections, {
    clientId: "target-client",
    email: "shared@example.com",
    name: "Shared Name",
  }), byClient);
  assert.strictEqual(findKiroConnectionByIdentity(connections, {
    email: " SHARED@example.com ",
    name: "Shared Name",
  }), byEmail);
  assert.strictEqual(findKiroConnectionByIdentity(connections, {
    name: " shared name ",
  }), byName);
});

test("filters candidates by normalized auth type", () => {
  const oauth = { id: "oauth", authType: " OAuth ", email: "same@example.com" };
  const apiKey = { id: "apikey", authType: "apikey", email: "same@example.com" };

  assert.strictEqual(findKiroConnectionByIdentity([oauth, apiKey], {
    authType: "APIKEY",
    email: "same@example.com",
  }), apiKey);
});

test("never matches by shared secrets or tokens", () => {
  const connection = {
    id: "existing",
    authType: "oauth",
    accessToken: "shared-token",
    refreshToken: "shared-refresh-token",
  };
  assert.equal(findKiroConnectionByIdentity([connection], {
    authType: "oauth",
  }), null);
});
