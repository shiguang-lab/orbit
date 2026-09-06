import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../src/vscode-combos/token-combos.js";

test("delegates Ollama version and tags requests to the VS Code models route", async () => {
  for (const path of ["api/version", "api/tags"]) {
    const delegated = Response.json({ path }, { status: 202 });
    let receivedRequest: Request | undefined;
    let loadedCombos = false;
    const request = new Request(`http://localhost/v1/vscode/token/${path}`);

    const context = { params: { token: "token" } };
    const resolveModels = async () => Response.json({ data: [] });
    const response = await GET(request, context, resolveModels, {
      getCombos: async () => {
        loadedCombos = true;
        return [];
      },
      getModels: (received, receivedContext, receivedResolver) => {
        receivedRequest = received;
        assert.strictEqual(receivedContext, context);
        assert.strictEqual(receivedResolver, resolveModels);
        return delegated;
      },
      projectCombo: () => null,
    });

    assert.strictEqual(response, delegated);
    assert.strictEqual(receivedRequest, request);
    assert.equal(loadedCombos, false);
  }
});

test("returns projected combo metadata with capabilities and no-store caching", async () => {
  const source = [{ id: "first" }, { id: "hidden" }];
  const projectionOptions: unknown[] = [];
  const projected = { id: "first", name: "First" };

  const response = await GET(new Request("http://localhost/v1/vscode/token/combos"), {}, async () => Response.json({ data: [] }), {
    getCombos: async () => source,
    getModels: () => {
      throw new Error("unexpected delegation");
    },
    projectCombo: (combo, options) => {
      projectionOptions.push(options);
      return combo.id === "first" ? projected : null;
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    object: "list",
    data: [projected],
    combos: [projected],
  });
  assert.deepEqual(projectionOptions, [
    { includeCapabilities: true },
    { includeCapabilities: true },
  ]);
});

test("returns the established 500 response when combo loading fails", async () => {
  const response = await GET(new Request("http://localhost/v1/vscode/token/combos"), {}, async () => Response.json({ data: [] }), {
    getCombos: async () => {
      throw new Error("database unavailable");
    },
    getModels: () => {
      throw new Error("unexpected delegation");
    },
    projectCombo: () => null,
  });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Failed to fetch combos" });
});
