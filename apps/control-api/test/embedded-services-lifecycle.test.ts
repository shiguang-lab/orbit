import assert from "node:assert/strict";
import test from "node:test";

import {
  getSupervisor,
  registerSupervisor,
  stopAllSupervisors,
} from "@orbit/core/control/embedded-services-lifecycle";

test("control lifecycle stops every registered embedded-service supervisor", async () => {
  const stopped: string[] = [];
  const supervisor = (tool: string) => ({
    getStatus: () => ({ tool }),
    stop: async () => {
      stopped.push(tool);
    },
  });

  registerSupervisor(supervisor("alpha") as never);
  registerSupervisor(supervisor("beta") as never);

  await stopAllSupervisors();

  assert.deepEqual(stopped.sort(), ["alpha", "beta"]);
  assert.equal(getSupervisor("alpha"), null);
  assert.equal(getSupervisor("beta"), null);

  await stopAllSupervisors();
  assert.deepEqual(stopped.sort(), ["alpha", "beta"]);
});

test("one failed supervisor does not prevent the others from stopping", async () => {
  let healthyStopped = false;
  registerSupervisor({
    getStatus: () => ({ tool: "failing" }),
    stop: async () => {
      throw new Error("stop failed");
    },
  } as never);
  registerSupervisor({
    getStatus: () => ({ tool: "healthy" }),
    stop: async () => {
      healthyStopped = true;
    },
  } as never);

  await stopAllSupervisors();

  assert.equal(healthyStopped, true);
  assert.equal(getSupervisor("failing"), null);
  assert.equal(getSupervisor("healthy"), null);
});
