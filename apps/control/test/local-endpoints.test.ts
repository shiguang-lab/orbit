import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isLocalRequestAllowed } from "../src/local-redis/local-endpoints.js";
import { LocalRedisController } from "../src/local-redis/local-redis.controller.js";
import type { LocalRedisService } from "../src/local-redis/local-redis.service.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalEnabled = process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED;
const originalToken = process.env.ORBIT_LOCAL_ENDPOINTS_TOKEN;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalEnabled === undefined) delete process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED;
  else process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED = originalEnabled;
  if (originalToken === undefined) delete process.env.ORBIT_LOCAL_ENDPOINTS_TOKEN;
  else process.env.ORBIT_LOCAL_ENDPOINTS_TOKEN = originalToken;
});

function context(peerIp: string, headers: FastifyRequest["headers"] = {}) {
  return { peerIp, headers };
}

test("fails closed without explicit request context", () => {
  assert.deepEqual(isLocalRequestAllowed(), {
    allowed: false,
    reason: "request context unavailable",
  });
});

test("allows canonical IPv4, IPv6, and IPv4-mapped loopback peers", () => {
  process.env.NODE_ENV = "development";
  for (const peerIp of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
    assert.deepEqual(isLocalRequestAllowed(context(peerIp)), { allowed: true });
  }
  assert.deepEqual(isLocalRequestAllowed(context("127.42.0.8")), {
    allowed: false,
    reason: "non-local origin",
  });
});

test("rejects every request carrying proxy-origin headers", () => {
  for (const headers of [
    { "x-forwarded-for": "127.0.0.1" },
    { "x-forwarded-host": "localhost" },
    { "x-forwarded-proto": "http" },
    { "x-real-ip": "127.0.0.1" },
    { forwarded: "for=127.0.0.1" },
  ]) {
    assert.deepEqual(isLocalRequestAllowed(context("127.0.0.1", headers)), {
      allowed: false,
      reason: "proxied origin",
    });
  }
});

test("never allows a remote peer through enablement, bearer token, or development mode", () => {
  process.env.NODE_ENV = "development";
  process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED = "1";
  process.env.ORBIT_LOCAL_ENDPOINTS_TOKEN = "desktop-secret";
  assert.deepEqual(
    isLocalRequestAllowed(context("203.0.113.5", {
      host: "127.0.0.1:8788",
      authorization: "Bearer desktop-secret",
    })),
    { allowed: false, reason: "non-local origin" },
  );
});

test("keeps the production switch as an additional loopback kill switch", () => {
  process.env.NODE_ENV = "production";
  assert.deepEqual(isLocalRequestAllowed(context("127.0.0.1")), {
    allowed: false,
    reason: "disabled in production",
  });
  process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED = "1";
  assert.deepEqual(isLocalRequestAllowed(context("127.0.0.1")), { allowed: true });
});

test("keeps request decisions independent without process-global request state", () => {
  process.env.NODE_ENV = "development";
  const allowed = context("127.0.0.1");
  const denied = context("198.51.100.9", { authorization: "Bearer anything" });

  assert.deepEqual(isLocalRequestAllowed(allowed), { allowed: true });
  assert.deepEqual(isLocalRequestAllowed(denied), { allowed: false, reason: "non-local origin" });
  assert.deepEqual(isLocalRequestAllowed(allowed), { allowed: true });
});

test("all controller actions pass request context and never execute when denied", async () => {
  process.env.NODE_ENV = "development";
  process.env.ORBIT_LOCAL_ENDPOINTS_ENABLED = "1";
  process.env.ORBIT_LOCAL_ENDPOINTS_TOKEN = "desktop-secret";
  const calls: string[] = [];
  const service = {
    start: async () => { calls.push("start"); return { status: 200, body: { action: "start" } }; },
    status: async () => { calls.push("status"); return { status: 200, body: { action: "status" } }; },
    stop: async () => { calls.push("stop"); return { status: 200, body: { action: "stop" } }; },
  } as unknown as LocalRedisService;
  const controller = new LocalRedisController(service);
  const request = {
    ip: "203.0.113.5",
    headers: { authorization: "Bearer desktop-secret" },
  } as FastifyRequest;
  const replies: Array<{ status: number; body: unknown }> = [];
  const reply = {
    status(code: number) {
      return {
        send(body: unknown) {
          replies.push({ status: code, body });
          return body;
        },
      };
    },
  } as unknown as FastifyReply;

  await controller.start(request, reply);
  await controller.status(request, reply);
  await controller.stop(request, reply);
  assert.deepEqual(calls, []);
  assert.deepEqual(replies, [
    { status: 403, body: { error: "non-local origin" } },
    { status: 403, body: { error: "non-local origin" } },
    { status: 403, body: { error: "non-local origin" } },
  ]);

  const localRequest = { ip: "127.0.0.1", headers: {} } as FastifyRequest;
  await controller.start(localRequest, reply);
  await controller.status(localRequest, reply);
  await controller.stop(localRequest, reply);
  assert.deepEqual(calls, ["start", "status", "stop"]);
  assert.deepEqual(replies.slice(-3), [
    { status: 200, body: { action: "start" } },
    { status: 200, body: { action: "status" } },
    { status: 200, body: { action: "stop" } },
  ]);
});
