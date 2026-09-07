import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";

test("settings import preserves a multipart JSON file through the Fastify buffer parser", async () => {
  const app = Fastify();
  app.addContentTypeParser("multipart/form-data", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
  app.post("/api/settings/import-json", async (request) => {
    assert.ok(Buffer.isBuffer(request.body));
    const form = await toWebRequest(request).formData();
    const file = form.get("file");
    assert.ok(file instanceof File);
    return { file: await file.text(), name: file.name };
  });
  const json = '{"name":"导入配置","enabled":true}\n';
  const boundary = "settings-import-boundary";
  try {
    const response = await app.inject({ method: "POST", url: "/api/settings/import-json",
      headers: { "content-type": `multipart/form-data; boundary="${boundary}"` },
      payload: Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="settings.json"\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--\r\n`),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { file: json, name: "settings.json" });
  } finally { await app.close(); }
});

test("settings import retains parsed JSON when creating an authenticated Web Request", async () => {
  const app = Fastify();
  app.post("/api/settings/import-json", async (request) => {
    const web = toWebRequest(request);
    assert.equal(web.headers.get("authorization"), "Bearer test-only-key");
    return { body: await web.json(), fastifyBody: request.body };
  });
  try {
    const body = { settings: { enabled: false }, connections: [] };
    const response = await app.inject({ method: "POST", url: "/api/settings/import-json",
      headers: { authorization: "Bearer test-only-key" }, payload: body });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { body, fastifyBody: body });
  } finally { await app.close(); }
});
