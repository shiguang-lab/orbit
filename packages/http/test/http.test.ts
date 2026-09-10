import assert from "node:assert/strict";
import test from "node:test";
import { ApiExceptionFilter, RequestIdMiddleware } from "../src/index.js";

test("request id middleware supports raw Node responses", () => {
  const request: { headers: Record<string, string>; id?: string } = {
    headers: { "x-request-id": "request-123" },
  };
  const headers = new Map<string, string>();
  let continued = false;

  new RequestIdMiddleware().use(
    request,
    { setHeader: (name, value) => headers.set(name, value) },
    () => { continued = true; },
  );

  assert.equal(request.id, "request-123");
  assert.equal(headers.get("x-request-id"), "request-123");
  assert.equal(continued, true);
});

test("exception filter supports raw Node responses", () => {
  const headers = new Map<string, string>();
  let body = "";
  const response = {
    statusCode: 0,
    setHeader: (name: string, value: string) => headers.set(name, value),
    end: (value: string) => { body = value; },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ id: "request-456" }),
    }),
  };

  new ApiExceptionFilter().catch(new Error("boom"), host as never);

  assert.equal(response.statusCode, 500);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(body), {
    error: { type: "server_error", message: "boom" },
    requestId: "request-456",
  });
});

test("exception filter redacts credentials from uncaught 5xx responses", () => {
  let body = "";
  const response = {
    statusCode: 0,
    setHeader: () => {},
    end: (value: string) => { body = value; },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  };

  new ApiExceptionFilter().catch(
    new Error("upstream rejected sk-proj-AbCdEfGhIjKlMnOpQrStUv"),
    host as never,
  );

  assert.doesNotMatch(body, /sk-proj-/);
  assert.match(body, /\[REDACTED\]/);
});
