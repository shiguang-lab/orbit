import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { validatedJsonBody } from "../src/shared/validation/helpers.ts";

test("validatedJsonBody returns a standard Web Response for malformed JSON", async () => {
  const request = new Request("http://localhost/example", {
    method: "POST",
    body: "not-json",
  });

  const result = await validatedJsonBody(request, z.object({ value: z.string() }));

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.response.constructor, Response);
  assert.equal(result.response.status, 400);
  assert.deepEqual(await result.response.json(), {
    error: {
      message: "Invalid request",
      details: [{ field: "body", message: "Invalid JSON body" }],
    },
  });
});
