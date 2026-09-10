import assert from "node:assert/strict";
import test from "node:test";

import {
  getPromptCacheCreationTokens,
  getPromptCacheCreationTokensOrNull,
} from "@orbit/contracts/usage/tokenAccounting";
import { buildCacheUsageLogMeta } from "../src/handlers/chatCore/cacheUsageMeta.ts";
import { extractUsageFromResponse } from "../src/handlers/usageExtractor.ts";
import { extractUsage, normalizeUsage } from "../src/utils/usageTracking.ts";

test("shared accounting reads every OpenAI-shaped cache-write container", () => {
  assert.equal(
    getPromptCacheCreationTokens({
      prompt_tokens_details: { cache_creation_tokens: 1911 },
    }),
    1911
  );
  assert.equal(
    getPromptCacheCreationTokens({ input_tokens_details: { cache_write_tokens: 1912 } }),
    1912
  );
  assert.equal(getPromptCacheCreationTokens({ cache_write_tokens: 1913 }), 1913);
  assert.equal(getPromptCacheCreationTokensOrNull({ cache_write_tokens: 0 }), 0);
  assert.equal(getPromptCacheCreationTokensOrNull({ prompt_tokens: 5 }), null);
});

test("non-streaming and streaming extraction preserve cache-write aliases", () => {
  assert.deepEqual(
    extractUsageFromResponse(
      {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 2,
          prompt_tokens_details: { cache_creation_tokens: 41 },
        },
      },
      "openai-compatible"
    ),
    {
      prompt_tokens: 100,
      completion_tokens: 2,
      cached_tokens: undefined,
      cache_creation_input_tokens: 41,
      reasoning_tokens: undefined,
    }
  );

  assert.equal(
    extractUsage({
      type: "response.completed",
      response: {
        usage: {
          input_tokens: 100,
          output_tokens: 2,
          input_tokens_details: { cache_write_tokens: 42 },
        },
      },
    })?.cache_creation_input_tokens,
    42
  );
  assert.equal(
    extractUsage({
      usage: { prompt_tokens: 100, completion_tokens: 2, cache_write_tokens: 43 },
    })?.cache_creation_input_tokens,
    43
  );
});

test("normalization and call-log metadata preserve values without inventing fields", () => {
  assert.equal(
    normalizeUsage({ prompt_tokens: 5, cache_write_tokens: 0 })?.cache_creation_input_tokens,
    0
  );
  assert.equal(
    normalizeUsage({ prompt_tokens: 5 })?.cache_creation_input_tokens,
    undefined
  );
  assert.deepEqual(
    buildCacheUsageLogMeta({
      prompt_tokens_details: { cached_tokens: 3 },
      input_tokens_details: { cache_write_tokens: 17 },
    }),
    { cacheReadTokens: 3, cacheCreationTokens: 17 }
  );
});
