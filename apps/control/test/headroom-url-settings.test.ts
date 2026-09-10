import assert from "node:assert/strict";
import test from "node:test";

import { updateSettingsSchema } from "../../../packages/core/src/shared/validation/settingsSchemas.ts";

test("Headroom URL settings accept empty/http(s), trim values, and reject unsafe schemes", () => {
  assert.equal(updateSettingsSchema.parse({ headroomUrl: "" }).headroomUrl, "");
  assert.equal(updateSettingsSchema.parse({ headroomUrl: "   " }).headroomUrl, "");
  assert.equal(
    updateSettingsSchema.parse({ headroomUrl: "  https://headroom.internal:9090  " }).headroomUrl,
    "https://headroom.internal:9090"
  );

  for (const headroomUrl of ["not-a-url", "javascript:alert(1)", "ftp://example.com/x", "file:///tmp/x"]) {
    assert.equal(updateSettingsSchema.safeParse({ headroomUrl }).success, false, headroomUrl);
  }
  assert.equal(
    updateSettingsSchema.safeParse({ headroomUrl: `http://example.com/${"x".repeat(500)}` }).success,
    false
  );
});
