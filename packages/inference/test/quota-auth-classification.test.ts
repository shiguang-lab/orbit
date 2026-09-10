import assert from "node:assert/strict";
import test from "node:test";
import { classifyProviderError, PROVIDER_ERROR_TYPES } from "@orbit/core/domain/provider-error-classifier";
import { isQuotaOrCreditsError } from "../src/services/combo/targetExhaustion.ts";

test("401 credit exhaustion remains quota instead of authentication failure", () => {
  assert.equal(
    classifyProviderError(401, "All connections credits exhausted", "chutes"),
    PROVIDER_ERROR_TYPES.QUOTA_EXHAUSTED
  );
  assert.equal(isQuotaOrCreditsError("All connections credits exhausted"), true);
  assert.equal(
    isQuotaOrCreditsError("generic upstream error", {
      code: "unauthorized",
      message: "quota exhausted for this billing cycle",
    }),
    true
  );
  assert.equal(isQuotaOrCreditsError("authentication expired"), false);
});
