import assert from "node:assert/strict";
import test from "node:test";

import { CircuitBreaker, STATE } from "../src/shared/utils/circuitBreaker.ts";

function breaker(label: string) {
  return new CircuitBreaker(`resolved-result-${label}-${Date.now()}-${Math.random()}`, {
    failureThreshold: 3,
    resetTimeout: 30_000,
  });
}

test("resolved failures are counted when classifyResult returns failure", async () => {
  const subject = breaker("failure");

  for (let attempt = 0; attempt < 3; attempt++) {
    await subject.execute(async () => ({ success: false, status: 503 }), {
      classifyResult: () => "failure",
    });
  }

  assert.equal(subject.failureCount, 3);
  assert.equal(subject.state, STATE.OPEN);
  subject.reset();
});

test("ignore leaves resolved-result accounting to the caller", async () => {
  const subject = breaker("ignore");
  subject._onFailure();
  subject._onFailure();
  const stateBefore = subject.state;

  await subject.execute(async () => ({ success: false, status: 503 }), {
    classifyResult: () => "ignore",
  });
  await subject.execute(async () => ({ success: true, status: 200 }), {
    classifyResult: () => "ignore",
  });

  assert.equal(subject.failureCount, 2);
  assert.equal(subject.state, stateBefore);
  subject.reset();
});

test("omitting classifyResult preserves resolved-is-success behavior", async () => {
  const subject = breaker("default");
  subject._onFailure();

  await subject.execute(async () => ({ success: false, status: 503 }));

  assert.equal(subject.failureCount, 0);
  assert.equal(subject.state, STATE.CLOSED);
  subject.reset();
});

test("a throwing result classifier falls back to success", async () => {
  const subject = breaker("throw");
  subject._onFailure();

  const result = await subject.execute(async () => "ok", {
    classifyResult: () => {
      throw new Error("classifier bug");
    },
  });

  assert.equal(result, "ok");
  assert.equal(subject.failureCount, 0);
  assert.equal(subject.state, STATE.CLOSED);
  subject.reset();
});
