import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { askFaro } from "../src/conductor/faro-proxy.js";

afterEach(() => {
  delete process.env.CONDUCTOR_SPOKESPERSON_URL;
  delete process.env.CONDUCTOR_HUB_TOKEN;
});

test("posts the message with the trimmed hub token and validates the response", async () => {
  process.env.CONDUCTOR_SPOKESPERSON_URL = "  http://faro.internal  ";
  process.env.CONDUCTOR_HUB_TOKEN = "  hub-secret  ";

  const answer = await askFaro("fleet status", {
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), "http://faro.internal/ask");
      assert.equal(init?.method, "POST");
      assert.deepEqual(init?.headers, {
        authorization: "Bearer hub-secret",
        "content-type": "application/json",
      });
      assert.equal(init?.body, JSON.stringify({ message: "fleet status" }));
      return Response.json({ text: "All systems online", pending: { confirmation: true }, ignored: "value" });
    }) as typeof fetch,
  });

  assert.deepEqual(answer, {
    ok: true,
    text: "All systems online",
    pending: { confirmation: true },
  });
});

test("uses the loopback default and normalizes a missing pending value to null", async () => {
  let requestedUrl = "";
  const answer = await askFaro("status", {
    fetchImpl: (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return Response.json({ text: "Ready" });
    }) as typeof fetch,
  });

  assert.equal(requestedUrl, "http://127.0.0.1:7920/ask");
  assert.deepEqual(answer, { ok: true, text: "Ready", pending: null });
});

test("returns the offline result for refused, invalid, or failed requests", async () => {
  const offline = { ok: false, text: "", pending: null };

  assert.deepEqual(
    await askFaro("status", {
      fetchImpl: (async () => new Response("refused", { status: 503 })) as typeof fetch,
    }),
    offline
  );
  assert.deepEqual(
    await askFaro("status", {
      fetchImpl: (async () => Response.json({ text: 42, pending: null })) as typeof fetch,
    }),
    offline
  );
  assert.deepEqual(
    await askFaro("status", {
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as typeof fetch,
    }),
    offline
  );
});
