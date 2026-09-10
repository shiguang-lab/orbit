import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { HTTP_STATUS, RateLimitReason } from "../src/config/constants.ts";
import { shouldCoolDownSearchConnection } from "../src/handlers/search/searchProxy.ts";
import { checkFallbackError, classifyError } from "../src/services/accountFallback.ts";
import {
  SUBSCRIPTION_QUOTA_COOLDOWN_MS,
  isSubscriptionQuotaText,
} from "../src/services/quotaTextCooldowns.ts";

const TAVILY_432_BODY = JSON.stringify({
  error:
    "This request exceeds your plan's set usage limit. Please upgrade your plan or contact support@tavily.com",
});

test("plan-limit error text is recognised as a subscription/plan quota signal", () => {
  assert.equal(isSubscriptionQuotaText(TAVILY_432_BODY.toLowerCase()), true);
  assert.equal(isSubscriptionQuotaText("plan limit exceeded"), true);
  assert.equal(isSubscriptionQuotaText("plan limit"), true);
  assert.equal(isSubscriptionQuotaText("usage limit exceeded"), true);
  // A plain transient failure must not be mistaken for an exhausted plan.
  assert.equal(isSubscriptionQuotaText("upstream connection reset"), false);
});

test("HTTP 432 maps to QUOTA_EXHAUSTED, not an unknown/auth error", () => {
  assert.equal(HTTP_STATUS.PLAN_LIMIT_EXCEEDED, 432);
  assert.equal(
    classifyError(HTTP_STATUS.PLAN_LIMIT_EXCEEDED, TAVILY_432_BODY),
    RateLimitReason.QUOTA_EXHAUSTED
  );
});

test("a 432 without plan text still cools the connection down for the plan-limit window", () => {
  // No plan wording and no rate-limit wording, so the generic text rules cannot
  // claim it — only the dedicated 432 branch decides.
  const result = checkFallbackError(
    HTTP_STATUS.PLAN_LIMIT_EXCEEDED,
    "upstream returned an unexpected status",
    0,
    null,
    "tavily-search"
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.equal(result.cooldownMs, SUBSCRIPTION_QUOTA_COOLDOWN_MS);
  assert.equal(result.permanent, undefined);
});

test("a 432 whose body carries plan-limit text still yields a fallback cooldown", () => {
  const result = checkFallbackError(
    HTTP_STATUS.PLAN_LIMIT_EXCEEDED,
    TAVILY_432_BODY,
    0,
    null,
    "tavily-search"
  );
  assert.equal(result.shouldFallback, true);
  assert.equal(result.reason, RateLimitReason.QUOTA_EXHAUSTED);
  assert.ok(result.cooldownMs > 0);
});

test("shouldCoolDownSearchConnection covers quota/transient statuses and plan-limit text only", () => {
  for (const status of [
    HTTP_STATUS.PAYMENT_REQUIRED,
    HTTP_STATUS.REQUEST_TIMEOUT,
    HTTP_STATUS.RATE_LIMITED,
    HTTP_STATUS.PLAN_LIMIT_EXCEEDED,
    HTTP_STATUS.SERVER_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
  ]) {
    assert.equal(shouldCoolDownSearchConnection(status, "boom"), true, `status ${status}`);
  }

  // A plain client error is the caller's fault — cooling the account down would
  // burn a healthy key for a malformed request.
  for (const status of [
    HTTP_STATUS.BAD_REQUEST,
    HTTP_STATUS.UNAUTHORIZED,
    HTTP_STATUS.FORBIDDEN,
    HTTP_STATUS.NOT_FOUND,
  ]) {
    assert.equal(shouldCoolDownSearchConnection(status, "bad request"), false, `status ${status}`);
  }

  // Plan-limit wording on a non-432 status is still a plan exhaustion.
  assert.equal(shouldCoolDownSearchConnection(HTTP_STATUS.BAD_REQUEST, TAVILY_432_BODY), true);
});

test("searchProxy marks the connection unavailable under the cooldown guard only", () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, "../src/handlers/search/searchProxy.ts"),
    "utf8"
  );

  assert.match(
    source,
    /if \(connectionId && shouldCoolDownSearchConnection\(response\.status, errorText\)\) \{/,
    "the mark must be gated on the search cooldown decision"
  );
  assert.match(
    source,
    /await markAccountUnavailable\(connectionId, response\.status, errorText, config\.id, null\);/,
    "the failure branch must record the connection cooldown"
  );
  // The cooldown mark is best-effort: a failure to record it must not break the
  // search response the caller is waiting for.
  assert.match(
    source,
    /catch \{\s*\/\* non-critical — background cooldown mark must not break the search response \*\/\s*\}/,
    "the mark must be wrapped in a non-critical try/catch"
  );
});
