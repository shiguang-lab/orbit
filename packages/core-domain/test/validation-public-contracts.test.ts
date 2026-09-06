import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

const contracts = {
  "./edge/count-tokens-validation": {
    entry: "./src/shared/validation/countTokensExports.ts",
    runtime: ["v1CountTokensSchema"],
  },
  "./edge/embedding-input-limits": {
    entry: "./src/shared/validation/embeddingInputExports.ts",
    runtime: ["MAX_EMBEDDING_INLINE_ITEM_BYTES", "MAX_EMBEDDING_INLINE_TOTAL_BYTES"],
  },
  "./edge/batches-validation-schemas": {
    entry: "./src/shared/validation/batchesExports.ts",
    runtime: ["v1BatchCreateSchema"],
  },
  "./edge/rerank-validation-schemas": {
    entry: "./src/shared/validation/rerankExports.ts",
    runtime: ["v1RerankSchema"],
  },
  "./edge/embeddings-validation-schemas": {
    entry: "./src/shared/validation/embeddingsExports.ts",
    runtime: ["v1EmbeddingsSchema"],
  },
  "./edge/moderation-validation-schemas": {
    entry: "./src/shared/validation/moderationExports.ts",
    runtime: ["v1ModerationSchema"],
  },
  "./edge/image-generation-validation": {
    entry: "./src/shared/validation/imageGenerationExports.ts",
    runtime: ["v1ImageGenerationSchema"],
  },
  "./edge/image-upscale-validation": {
    entry: "./src/shared/validation/imageUpscaleExports.ts",
    runtime: ["v1ImageUpscaleSchema"],
  },
  "./edge/ocr-validation": {
    entry: "./src/shared/validation/ocrExports.ts",
    runtime: ["v1OcrSchema"],
  },
  "./edge/search-validation": {
    entry: "./src/shared/validation/searchExports.ts",
    runtime: ["v1SearchSchema"],
  },
  "./edge/segment-validation": {
    entry: "./src/shared/validation/segmentExports.ts",
    runtime: ["v1SegmentSchema"],
  },
  "./control/provider-validation-schemas": {
    entry: "./src/shared/validation/providerValidationExports.ts",
    runtime: [
      "createProviderNodeSchema",
      "paginationSchema",
      "providerModelMutationSchema",
      "providerNodeValidateSchema",
      "updateProviderNodeSchema",
      "validateProviderApiKeySchema",
    ],
  },
  "./control/oauth-validation": {
    entry: "./src/shared/validation/oauthExports.ts",
    runtime: [
      "applyLocalAgyAuthSchema",
      "cursorImportSchema",
      "kiroApiKeyImportSchema",
      "kiroImportSchema",
      "oauthDeviceCompleteSchema",
      "oauthExchangeSchema",
      "oauthImportTokenSchema",
      "oauthPasteCredentialsSchema",
      "oauthPollSchema",
      "traeImportSchema",
      "zedImportSchema",
    ],
  },
  "./control/cloud-validation": {
    entry: "./src/shared/validation/cloudExports.ts",
    runtime: [
      "cloudCredentialUpdateSchema",
      "cloudModelAliasUpdateSchema",
      "cloudResolveAliasSchema",
      "cloudSyncActionSchema",
    ],
  },
  "./control/volcengine-validation": {
    entry: "./src/shared/validation/volcenginePlanExports.ts",
    runtime: [
      "volcenginePlanCodeSchema",
      "volcenginePlanConnectSchema",
      "volcenginePlanIdentitySchema",
    ],
  },
} as const;

test("validation subpaths expose only their declared runtime contracts", async () => {
  const implementationPaths = new Set<string>();

  for (const [subpath, contract] of Object.entries(contracts)) {
    const entry = manifest.exports[subpath];
    assert.deepEqual(entry, {
      types: contract.entry,
      import: contract.entry,
    });
    implementationPaths.add(contract.entry);

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.runtime].sort(), `${subpath} runtime`);
  }

  assert.equal(implementationPaths.size, Object.keys(contracts).length);
});
