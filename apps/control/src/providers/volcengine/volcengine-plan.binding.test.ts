import assert from "node:assert/strict";
import test from "node:test";
import { findTargetConnection } from "./volcengine-plan.binding.js";

const provider = "volcengine-coding-plan";

test("Volcengine plan binding honors safe connection matching precedence", () => {
  const connections = [
    { id: "custom", provider, name: "main", apiKey: "ark-old", providerSpecificData: {} },
    {
      id: "key-id",
      provider,
      name: "other",
      apiKey: "ark-other",
      providerSpecificData: { volcApiKeyId: 42 },
    },
  ];
  assert.equal(
    findTargetConnection(connections, {
      targetConnectionId: "custom",
      provider,
      apiKey: "ark-new",
      apiKeyId: 42,
      defaultName: "Volcano Ark Coding Plan",
    })?.id,
    "custom"
  );
  assert.equal(
    findTargetConnection(connections, {
      provider,
      apiKey: "ark-new",
      apiKeyId: 42,
      defaultName: "Volcano Ark Coding Plan",
    })?.id,
    "key-id"
  );
});

test("Volcengine plan binding never adopts an ambiguous connection", () => {
  assert.equal(
    findTargetConnection(
      [
        { id: "one", provider, name: "one" },
        { id: "two", provider, name: "two" },
      ],
      { provider, apiKey: "ark-new", apiKeyId: 7, defaultName: "Volcano Ark Coding Plan" }
    ),
    undefined
  );
});
