import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const providerAssets = new URL("../public/providers/", import.meta.url);

test("unproven Nimble asset is not redistributed", () => {
  assert.equal(existsSync(new URL("nimble-search.svg", providerAssets)), false);
});

test("Opper asset matches its immutable proven upstream hash", () => {
  const bytes = readFileSync(new URL("opper.svg", providerAssets));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "e45d0409e7746946f204903ad6e7da267d805b7d7534fa684eeb7b8ac5717791"
  );
});
