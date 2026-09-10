import assert from "node:assert/strict";
import test from "node:test";

import { createProviderNode, deleteProviderNode } from "@orbit/core/db/provider-nodes";
import {
  findShadowedCompatibleNode,
  handleNoCredentials,
} from "../src/handlers/chatHelpers.ts";

type ErrorBody = { error?: { message?: string } };

const shadowedNode = {
  id: "openai-compatible-chat-01f72ee6-0000-4000-8000-000000000000",
  name: "Openference (custom node)",
  prefix: "of",
};

test("lookup matches a compatible node by the built-in provider alias", async () => {
  await deleteProviderNode(shadowedNode.id).catch(() => undefined);
  await createProviderNode({
    ...shadowedNode,
    type: "openai-compatible",
    apiType: "chat",
    baseUrl: "https://api.openference.com/v1",
  });

  try {
    assert.deepEqual(await findShadowedCompatibleNode("openference"), shadowedNode);
    assert.equal(await findShadowedCompatibleNode("openai"), null);
    assert.equal(await findShadowedCompatibleNode(shadowedNode.id), null);
    assert.equal(await findShadowedCompatibleNode(""), null);
    assert.equal(await findShadowedCompatibleNode(undefined), null);
  } finally {
    await deleteProviderNode(shadowedNode.id);
  }
});

test("no-credentials error names the shadowed custom provider node", async () => {
  const response = handleNoCredentials(
    null,
    null,
    "openference",
    "GLM-5.2",
    null,
    null,
    undefined,
    false,
    shadowedNode
  );
  const message = ((await response.json()) as ErrorBody).error?.message ?? "";

  assert.equal(response.status, 401);
  assert.match(message, /^No active credentials for provider: openference\./);
  assert.match(message, /prefix "of" is reserved by the built-in provider "openference"/);
  assert.match(message, /"Openference \(custom node\)" \(openai-compatible-chat-01f72ee6/);
  assert.match(message, /"of\/GLM-5\.2"/);
  assert.match(message, /Rename that node's prefix/);
});

test("combo keeps its 404 fall-through contract and combines both hints", async () => {
  const response = handleNoCredentials(
    null,
    null,
    "openference",
    "GLM-5.2",
    null,
    null,
    ["ofc"],
    true,
    { ...shadowedNode, name: null }
  );
  const message = ((await response.json()) as ErrorBody).error?.message ?? "";

  assert.equal(response.status, 404);
  assert.match(message, /Try one of: ofc\/GLM-5\.2\./);
  assert.match(message, /custom provider node openai-compatible-chat-01f72ee6/);
});

test("plain no-credentials error is unchanged without a shadowed node", async () => {
  const response = handleNoCredentials(
    null,
    null,
    "openference",
    "GLM-5.2",
    null,
    null,
    undefined,
    false
  );
  assert.equal(response.status, 401);
  assert.equal(
    ((await response.json()) as ErrorBody).error?.message,
    "No active credentials for provider: openference."
  );
});
