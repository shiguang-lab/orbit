import assert from "node:assert/strict";
import test from "node:test";

import { isControlPlanePath, resolveApiUrl } from "../src/cli/api.mjs";

test("local split routing sends management APIs to control and inference APIs to edge", () => {
  const previous = {
    base: process.env.ORBIT_BASE_URL,
    context: process.env.ORBIT_CONTEXT,
    control: process.env.ORBIT_CONTROL_URL,
    port: process.env.PORT,
  };
  delete process.env.ORBIT_BASE_URL;
  delete process.env.ORBIT_CONTEXT;
  process.env.ORBIT_CONTROL_URL = "http://127.0.0.1:19002/";
  process.env.PORT = "19001";
  try {
    assert.equal(isControlPlanePath("/api/providers"), true);
    assert.equal(isControlPlanePath("/api/v1/models"), false);
    assert.equal(resolveApiUrl("/api/providers"), "http://127.0.0.1:19002/api/providers");
    assert.equal(resolveApiUrl("/api/v1/models"), "http://localhost:19001/api/v1/models");
    assert.equal(
      resolveApiUrl("/api/providers", { baseUrl: "https://remote.example" }),
      "https://remote.example/api/providers",
    );
  } finally {
    for (const [key, value] of Object.entries({
      ORBIT_BASE_URL: previous.base,
      ORBIT_CONTEXT: previous.context,
      ORBIT_CONTROL_URL: previous.control,
      PORT: previous.port,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
