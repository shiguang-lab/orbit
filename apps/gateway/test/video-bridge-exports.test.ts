import assert from "node:assert/strict";
import test from "node:test";

import { probeVideoRuntime } from "@orbit/core/guardrails/video-runtime-probe";
import { getBridgeStats } from "@orbit/core/guardrails/modality-bridge-stats";
import {
  isVideoBridgeDrilldownRemoteAccessEnabled,
  VIDEO_BRIDGE_DRILLDOWN_PATH,
  VIDEO_DRILLDOWN_VARIANTS,
  VideoDrilldownCache,
  VideoDrilldownLifecycle,
} from "@orbit/core/edge/video-bridge-drilldown";

test("video bridge capabilities resolve through edge-owned public exports", () => {
  assert.equal(typeof probeVideoRuntime, "function");
  assert.equal(typeof getBridgeStats, "function");
  assert.equal(typeof VideoDrilldownCache, "function");
  assert.equal(typeof VideoDrilldownLifecycle, "function");
  assert.equal(VIDEO_BRIDGE_DRILLDOWN_PATH, "/api/modality-bridge/video/drilldown");
  assert.deepEqual(VIDEO_DRILLDOWN_VARIANTS, ["preview", "standard", "detail"]);
});

test("video bridge drill-down remote access remains opt-in", () => {
  assert.equal(isVideoBridgeDrilldownRemoteAccessEnabled({}), false);
  assert.equal(
    isVideoBridgeDrilldownRemoteAccessEnabled({
      ORBIT_VIDEO_BRIDGE_DRILLDOWN_REMOTE_ENABLED: "true",
    }),
    true,
  );
});
