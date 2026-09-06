import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

test("edge-gateway exclusively owns the Telegram update ingress", () => {
  const edgeAppModule = read("apps/edge-gateway/src/app.module.ts");
  const controlAppModule = read("apps/control-api/src/app.module.ts");
  const edgeRoutes = read("apps/edge-gateway/src/routes/owned-routes.manifest.ts");

  assert.match(edgeAppModule, /from "\.\/telegram\/telegram\.module\.js"/);
  assert.match(edgeAppModule, /\bTelegramModule\b/);
  assert.doesNotMatch(controlAppModule, /\bTelegramModule\b|\.\/telegram\/telegram\.module/);
  assert.match(edgeRoutes, /path: "\/api\/telegram\/update", methods: \["POST"\]/);

  for (const retiredPath of [
    "apps/control-api/src/telegram/telegram.controller.ts",
    "apps/control-api/src/telegram/telegram.service.ts",
    "apps/control-api/src/telegram/telegram.module.ts",
    "apps/control-api/src/telegram/handlers/update.handler.ts",
    "apps/control-api/src/telegram/runtime/bot-api.ts",
    "apps/control-api/src/telegram/runtime/chat-proxy.ts",
    "apps/control-api/src/telegram/runtime/config.ts",
    "apps/control-api/src/telegram/runtime/error-message.ts",
    "apps/control-api/src/telegram/runtime/index.ts",
    "apps/control-api/src/telegram/runtime/init-data.ts",
  ]) {
    assert.equal(existsSync(resolve(repoRoot, retiredPath)), false, retiredPath);
  }
});

test("Telegram ingress keeps its public path and direct chat behavior", () => {
  const controller = read("apps/edge-gateway/src/telegram/telegram.controller.ts");
  const handler = read("apps/edge-gateway/src/telegram/handlers/update.handler.ts");

  assert.match(controller, /@Controller\("api\/telegram"\)/);
  assert.match(controller, /@Post\("update"\)/);
  assert.match(handler, /proxyChat\(telegramUserId, message, handleChat\)/);
  assert.match(handler, /proxyChat\(chatId, trimmed, handleChat\)/);
});
