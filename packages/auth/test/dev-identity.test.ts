import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import {
  handleSession,
  isLocalDevMode,
  DEV_ADMIN_IDENTITY,
} from "../src/gateway-session.js";
import { csrfPlugin, issueDashboardCsrfToken } from "../src/fastify/csrf.plugin.js";
import { authzPlugin } from "../src/fastify/authz.plugin.js";

const origNodeEnv = process.env.NODE_ENV;
const origDevIdentity = process.env.SG_DEV_IDENTITY;

afterEach(() => {
  if (origNodeEnv !== undefined) {
    process.env.NODE_ENV = origNodeEnv;
  } else {
    delete process.env.NODE_ENV;
  }
  if (origDevIdentity !== undefined) {
    process.env.SG_DEV_IDENTITY = origDevIdentity;
  } else {
    delete process.env.SG_DEV_IDENTITY;
  }
});

test("isLocalDevMode is enabled when SG_DEV_IDENTITY=1 or NODE_ENV=development", () => {
  process.env.NODE_ENV = "production";
  process.env.SG_DEV_IDENTITY = "1";
  assert.equal(isLocalDevMode(), false);

  process.env.NODE_ENV = "test";
  assert.equal(isLocalDevMode(), false);

  process.env.NODE_ENV = "development";
  delete process.env.SG_DEV_IDENTITY;
  assert.equal(isLocalDevMode(), true);

  delete process.env.NODE_ENV;
  process.env.SG_DEV_IDENTITY = "1";
  assert.equal(isLocalDevMode(), true);
});

test("dev session returns 200 with local dev admin identity when local dev mode is active", async () => {
  process.env.SG_DEV_IDENTITY = "1";
  const app = Fastify({ logger: false });
  app.get("/api/auth/session", handleSession);

  const response = await app.inject({
    method: "GET",
    url: "/api/auth/session",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.authenticated, true);
  assert.equal(body.subject, DEV_ADMIN_IDENTITY.sub);
  assert.equal(body.displayName, DEV_ADMIN_IDENTITY.displayName);
  assert.ok(body.roles.includes("system:admin"));
  await app.close();
});

test("dev mode issues CSRF token and permits protected routes without upstream gateway", async () => {
  process.env.SG_DEV_IDENTITY = "1";
  const app = Fastify({ logger: false });
  authzPlugin(app);
  csrfPlugin(app);

  app.get("/api/auth/csrf", async (request, reply) => {
    const token = await issueDashboardCsrfToken(request);
    if (!token) return reply.status(503).send({ error: "no token" });
    return reply.send(token);
  });

  app.post("/api/settings", async (_request, reply) => reply.send({ success: true }));

  const csrfResp = await app.inject({ method: "GET", url: "/api/auth/csrf" });
  assert.equal(csrfResp.statusCode, 200);
  assert.ok(csrfResp.json().token);

  const postResp = await app.inject({ method: "POST", url: "/api/settings" });
  assert.equal(postResp.statusCode, 200);
  assert.equal(postResp.json().success, true);
  await app.close();
});
