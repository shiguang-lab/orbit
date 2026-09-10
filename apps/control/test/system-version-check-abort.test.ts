import assert from "node:assert/strict";
import test from "node:test";

process.env.ORBIT_UPDATE_REGISTRY_URL = "https://updates.example.test/latest";
process.env.ORBIT_RELEASES_LATEST_URL = "https://updates.example.test/release";

const { getLatestVersionFromRegistry, getLatestVersionFromReleaseEndpoint } =
  await import("../src/system/version-check.ts");

test("HTTP version sources cancel a body reader when the request signal aborts", async () => {
  let cancellationCount = 0;
  const fakeFetch = (async (_url: string, init?: RequestInit) => {
    const response = new Response(
      new ReadableStream({
        start() {},
        cancel() {
          cancellationCount += 1;
        },
      }),
      { status: 200 }
    );
    setImmediate(() => init?.signal?.dispatchEvent(new Event("abort")));
    return response;
  }) as typeof fetch;

  assert.equal(await getLatestVersionFromRegistry(fakeFetch), null);
  assert.equal(await getLatestVersionFromReleaseEndpoint(fakeFetch), null);
  assert.equal(cancellationCount, 2);
});
