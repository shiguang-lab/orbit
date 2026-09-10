import assert from "node:assert/strict";import test from "node:test";import { CHANNEL_EVENTS,getChannelForEvent } from "../src/lib/events/types.ts";
test("agent task transitions are routed to the dedicated live channel",()=>{assert.deepEqual(CHANNEL_EVENTS.agents,["agent.task.updated"]);assert.equal(getChannelForEvent("agent.task.updated"),"agents");});
