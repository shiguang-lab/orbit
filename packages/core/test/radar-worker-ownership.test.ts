import assert from "node:assert/strict";
import test from "node:test";

import {
  initRadarSyncScheduler,
  stopRadarSyncScheduler,
  type RadarSchedulerDeps,
} from "../src/lib/radar/scheduler.ts";

test("worker keeps the Radar scheduler armed while opt-in is off", () => {
  let intervalCount = 0;
  const deps: RadarSchedulerDeps = {
    getFlag: () => true,
    getSettings: () => ({ optIn: false }),
    setIntervalFn: ((callback: () => void) => {
      intervalCount += 1;
      return { unref: () => undefined, callback };
    }) as unknown as typeof setInterval,
    clearIntervalFn: (() => undefined) as typeof clearInterval,
  };

  try {
    assert.equal(initRadarSyncScheduler(deps), true);
    assert.equal(intervalCount, 1);
  } finally {
    stopRadarSyncScheduler(deps);
  }
});
