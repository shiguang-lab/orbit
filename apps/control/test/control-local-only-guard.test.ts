import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { authzPlugin, type EngineAuthAdapter } from "@orbit/auth";
import { installControlLocalOnlyGuard } from "../src/infrastructure/control-local-only.guard.js";

function engine(options: { authRequired: boolean; validManageKey?: string }): EngineAuthAdapter {
  return {
    isValidApiKey: async (key) => key === options.validManageKey,
    getApiKeyMetadata: async (key) => key === options.validManageKey
      ? { scopes: ["manage"], name: "test" }
      : null,
    isCliTokenAuthValid: async () => false,
    getSettings: async () => options.authRequired ? { requireLogin: true } : {},
  };
}

async function buildApp(options: {
  devMode?: boolean;
  authRequired?: boolean;
  validManageKey?: string;
}) {
  const app = Fastify({ logger: false });
  installControlLocalOnlyGuard(app);
  authzPlugin(app, {
    devMode: options.devMode,
    engine: engine({
      authRequired: options.authRequired ?? true,
      validManageKey: options.validManageKey,
    }),
  });
  app.get("/api/ordinary", async () => ({ ok: true }));
  app.get("/api/local/redis/status", async () => ({ ok: true }));
  await app.ready();
  return app;
}

test("does not broaden the locality gate beyond the local endpoint prefix", async () => {
  const app = await buildApp({ devMode: true });
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/ordinary",
      remoteAddress: "203.0.113.9",
    });
    assert.equal(response.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("allows a direct loopback socket", async () => {
  const app = await buildApp({ devMode: true });
  try {
    for (const remoteAddress of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      const response = await app.inject({
        method: "GET",
        url: "/api/local/redis/status",
        remoteAddress,
      });
      assert.equal(response.statusCode, 200);
    }
  } finally {
    await app.close();
  }
});

test("rejects remote sockets before dev-mode and requireLogin=false exemptions", async () => {
  for (const options of [{ devMode: true }, { authRequired: false }]) {
    const app = await buildApp(options);
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/local/redis/status",
        remoteAddress: "203.0.113.9",
      });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error.code, "LOCAL_ONLY");
    } finally {
      await app.close();
    }
  }
});

test("rejects a remote socket even with a valid manage bearer", async () => {
  const app = await buildApp({ validManageKey: "manage-secret" });
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/local/redis/status",
      headers: { authorization: "Bearer manage-secret" },
      remoteAddress: "203.0.113.9",
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "LOCAL_ONLY");
  } finally {
    await app.close();
  }
});

test("rejects a loopback proxy socket carrying forwarding headers", async () => {
  const app = await buildApp({ devMode: true });
  try {
    for (const headers of [
      { "x-forwarded-for": "203.0.113.9" },
      { "x-real-ip": "203.0.113.9" },
      { forwarded: "for=203.0.113.9" },
      { "x-forwarded-proto": "https" },
    ]) {
      const response = await app.inject({
        method: "GET",
        url: "/api/local/redis/status",
        headers,
        remoteAddress: "127.0.0.1",
      });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error.code, "LOCAL_ONLY");
    }
  } finally {
    await app.close();
  }
});
