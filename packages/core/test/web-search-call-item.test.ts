import assert from "node:assert/strict";
import test from "node:test";

import { ORBIT_WEB_SEARCH_FALLBACK_TOOL_NAME } from "@orbit/contracts/gateway-tool-names";
import { buildWebSearchCallItem } from "../src/lib/skills/interception.ts";

test("successful fallback search becomes a native Responses web_search_call", () => {
  const item = buildWebSearchCallItem(
    { id: "call_search", name: ORBIT_WEB_SEARCH_FALLBACK_TOOL_NAME, arguments: {} },
    {
      success: true,
      query: "latest Orbit release",
      results: [
        {
          title: "Orbit Docs",
          url: "https://example.com/orbit",
          snippet: "Documentation",
        },
        { url: "https://example.com/no-title", display_url: "example.com/no-title" },
        { title: "No URL", url: "" },
      ],
    }
  );

  assert.equal(item?.id, "ws_call_search");
  assert.equal(item?.type, "web_search_call");
  assert.equal(item?.status, "completed");
  assert.deepEqual(item?.action, {
    type: "web_search",
    query: "latest Orbit release",
    sources: [
      { title: "Orbit Docs", url: "https://example.com/orbit", caption: "Documentation" },
      {
        title: "https://example.com/no-title",
        url: "https://example.com/no-title",
        caption: "example.com/no-title",
      },
    ],
  });
});

test("non-search and failed fallback calls do not emit web_search_call", () => {
  const searchCall = {
    id: "call_search",
    name: ORBIT_WEB_SEARCH_FALLBACK_TOOL_NAME,
    arguments: {},
  };
  assert.equal(buildWebSearchCallItem(searchCall, { success: false }), null);
  assert.equal(buildWebSearchCallItem(searchCall, null), null);
  assert.equal(
    buildWebSearchCallItem(
      { id: "call_other", name: "other_tool", arguments: {} },
      { success: true }
    ),
    null
  );
});
