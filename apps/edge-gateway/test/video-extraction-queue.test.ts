import assert from "node:assert/strict";
import test from "node:test";

import {
  createVideoExtractionQueue,
  VideoExtractionQueueError,
} from "../src/video-bridge/runtime/extraction-queue.ts";

test("edge-owned video extraction queue enforces pending capacity", async () => {
  const queue = createVideoExtractionQueue({ concurrency: 1, maxPending: 1, maxQueuedBytes: 10 });
  let release!: () => void;
  const active = queue.run(4, () => new Promise<void>((resolve) => { release = resolve; }));
  const pending = queue.run(4, async () => undefined);
  await assert.rejects(
    queue.run(1, async () => undefined),
    (error) => error instanceof VideoExtractionQueueError && error.code === "QUEUE_CAPACITY",
  );
  release();
  await Promise.all([active, pending]);
});
