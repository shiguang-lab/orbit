import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { toWebRequest } from "../src/web-handler-adapter.ts";

test("converts real Fastify headers and parsed JSON into a Web Request", async () => {
  const app = Fastify();
  app.post("/api/providers/test-batch", async (request) => {
    const web = toWebRequest(request);
    assert.ok(web instanceof Request);
    assert.ok(web.headers instanceof Headers);
    return {
      authorization: web.headers.get("authorization"),
      cookie: web.headers.get("cookie"),
      identity: web.headers.get("x-sg-identity"),
      method: web.method,
      pathname: new URL(web.url).pathname,
      body: await web.json(),
    };
  });
  try {
    const body = { mode: "selected", connectionIds: ["test-connection"] };
    const response = await app.inject({
      method: "POST", url: "/api/providers/test-batch",
      headers: { authorization: "Bearer test-key", cookie: "session=test-session", "x-sg-identity": "test-assertion" },
      payload: body,
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      authorization: "Bearer test-key", cookie: "session=test-session", identity: "test-assertion",
      method: "POST", pathname: "/api/providers/test-batch", body,
    });
  } finally { await app.close(); }
});

test("GET query and repeated header values survive conversion", async () => {
  const app = Fastify();
  app.get("/api/providers", (request) => {
    const web = toWebRequest(request);
    assert.equal(web.body, null);
    return { query: new URL(web.url).searchParams.get("provider"), values: web.headers.get("x-example") };
  });
  try {
    const response = await app.inject({ method: "GET", url: "/api/providers?provider=qoder", headers: { "x-example": ["first", "second"] } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { query: "qoder", values: "first,second" });
  } finally { await app.close(); }
});

test("multipart buffers retain the boundary and file contents", async () => {
  const app = Fastify();
  app.addContentTypeParser(/^multipart\/form-data/, { parseAs: "buffer" }, (_request, body, done) => done(null, body));
  app.post("/import", async (request) => {
    const form = await toWebRequest(request).formData();
    const file = form.get("file") as File;
    return { name: file.name, content: await file.text() };
  });
  try {
    const form = new FormData();
    form.set("file", new Blob(["test-content"]), "test.sqlite");
    const source = new Request("http://localhost/import", { method: "POST", body: form });
    const response = await app.inject({ method: "POST", url: "/import",
      headers: { "content-type": source.headers.get("content-type")! },
      payload: Buffer.from(await source.arrayBuffer()),
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { name: "test.sqlite", content: "test-content" });
  } finally { await app.close(); }
});

test("HTTP apps never cast a Node request into a Web Request", () => {
  for (const app of ["control-api", "edge-gateway"]) {
    const directory = fileURLToPath(new URL(`../../../apps/${app}/src/`, import.meta.url));
    for (const file of readdirSync(directory, { recursive: true }).map(String).filter(file => file.endsWith(".ts"))) {
      assert.doesNotMatch(readFileSync(`${directory}${file}`, "utf8"), /\.raw\s+as\s+(?:unknown\s+as\s+)?Request\b/, file);
    }
  }
});
