import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "js-yaml";

import { GET, generateExampleFromSchema } from "../src/docs/handlers/openapi-spec.handler.js";

test("required object fields without property schemas do not crash example generation", () => {
  assert.deepEqual(generateExampleFromSchema({ type: "object", required: ["input", "model"], additionalProperties: true }, {}), { input: null, model: null });
  assert.deepEqual(generateExampleFromSchema({ type: "object" }, {}), {});
  assert.deepEqual(generateExampleFromSchema({ type: "object", required: ["input", "model"], properties: { model: { type: "string", example: "embedding-model" } } }, {}), { input: null, model: "embedding-model" });
});

test("nested and referenced object schemas preserve declared examples", () => {
  const schema = { type: "object", required: ["items"], properties: { items: { type: "array", items: { $ref: "#/components/schemas/Input" } } } };
  assert.deepEqual(generateExampleFromSchema(schema, { Input: { type: "object", required: ["input"] } }), { items: [{ input: null }] });
  assert.deepEqual(generateExampleFromSchema({ type: "object", example: { input: "sample" } }, {}), { input: "sample" });
});

test("the complete production OpenAPI document returns every supported operation", async () => {
  const spec = load(readFileSync(new URL("../../../packages/core/docs/openapi.yaml", import.meta.url), "utf8")) as { paths: Record<string, Record<string, unknown>> };
  const expected = Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods)
    .filter(method => ["get", "post", "put", "patch", "delete"].includes(method))
    .map(method => `${method.toUpperCase()} ${path}`)).sort();
  const response = GET();
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.deepEqual(catalog.endpoints.map((endpoint: { method: string; path: string }) => `${endpoint.method} ${endpoint.path}`).sort(), expected);
  const multimodal = catalog.endpoints.find((endpoint: { method: string; path: string }) => endpoint.method === "POST" && endpoint.path === "/api/v1/multimodal-embeddings");
  assert.deepEqual(multimodal.exampleBody, { input: null, model: null });
  assert.deepEqual(await GET().json(), catalog);
});

test("the registered OpenAPI route serves the catalog in the source runtime", async () => {
  const { NestFactory } = await import("@nestjs/core");
  const { FastifyAdapter } = await import("@nestjs/platform-fastify");
  const { DocsModule } = await import("../src/docs/docs.module.js");
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create(DocsModule, adapter, { logger: false });
  try {
    await app.init();
    await adapter.getInstance().ready();
    const response = await adapter.getInstance().inject({ url: "/api/openapi/spec" });
    assert.equal(response.statusCode, 200, response.body);
    assert.ok(response.json().endpoints.length > 0);
  } finally {
    await app.close();
  }
});
