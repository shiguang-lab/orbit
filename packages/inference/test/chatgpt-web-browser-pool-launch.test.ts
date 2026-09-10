import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolvePlainBrowserLaunchOptions } from "../src/services/browserPool.ts";

describe("ChatGPT Web browser-pool launch options", () => {
  test("keeps existing browser-pool callers headless by default", () => {
    const options = resolvePlainBrowserLaunchOptions({});

    assert.equal(options.headless, true);
    assert.equal(options.executablePath, undefined);
    assert.equal(options.args?.includes("--window-position=-32000,-32000"), false);
  });

  test("uses an explicitly selected system browser for headed first-party sessions", () => {
    const options = resolvePlainBrowserLaunchOptions({
      headless: false,
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

    assert.equal(options.headless, false);
    assert.equal(
      options.executablePath,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
    assert.equal(options.args?.includes("--window-position=-32000,-32000"), true);
  });
});
