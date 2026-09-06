import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveLiveWsPath,
  resolveLiveWsPublicUrl,
  resolveLiveWsUrl,
  sanitizeLiveWsPort,
} from "../src/ws/ws-path.js";

test("derives the path only from valid WebSocket URLs and preserves the fallback", () => {
  assert.equal(deriveLiveWsPath("wss://gateway.example/live/custom?token=x"), "/live/custom");
  assert.equal(deriveLiveWsPath("ws://localhost:20132/"), "/live-ws");
  assert.equal(deriveLiveWsPath("https://gateway.example/live"), "/live-ws");
  assert.equal(deriveLiveWsPath("not a URL"), "/live-ws");
  assert.equal(deriveLiveWsPath(), "/live-ws");
});

test("resolves runtime public URL before the build-time fallback", () => {
  assert.equal(resolveLiveWsPublicUrl({
    LIVE_WS_PUBLIC_URL: "  wss://runtime.example/socket  ",
    NEXT_PUBLIC_LIVE_WS_PUBLIC_URL: "wss://build.example/socket",
  } as NodeJS.ProcessEnv), "wss://runtime.example/socket");
  assert.equal(resolveLiveWsPublicUrl({
    LIVE_WS_PUBLIC_URL: "https://invalid.example",
    NEXT_PUBLIC_LIVE_WS_PUBLIC_URL: "ws://fallback.example/live",
  } as NodeJS.ProcessEnv), "ws://fallback.example/live");
  assert.equal(resolveLiveWsPublicUrl({} as NodeJS.ProcessEnv), null);
});

test("sanitizes ports without changing the valid range", () => {
  assert.equal(sanitizeLiveWsPort("20132"), 20132);
  assert.equal(sanitizeLiveWsPort(65535), 65535);
  assert.equal(sanitizeLiveWsPort(0), null);
  assert.equal(sanitizeLiveWsPort(65536), null);
  assert.equal(sanitizeLiveWsPort("20.5"), null);
});

test("preserves URL precedence, handshake overrides, and invalid-default fallback", () => {
  const base = {
    defaultUrl: "wss://gateway.example:20132/live-ws",
    handshakePort: 30132,
    handshakePath: "/runtime-ws",
  };
  assert.equal(resolveLiveWsUrl({ ...base, explicit: "ws://explicit.example/x", handshakeUrl: "wss://handshake.example/y" }), "ws://explicit.example/x");
  assert.equal(resolveLiveWsUrl({ ...base, handshakeUrl: "wss://handshake.example/y" }), "wss://handshake.example/y");
  assert.equal(resolveLiveWsUrl(base), "wss://gateway.example:30132/runtime-ws");
  assert.equal(resolveLiveWsUrl({ defaultUrl: "invalid", handshakePort: 30132 }), "invalid");
});
