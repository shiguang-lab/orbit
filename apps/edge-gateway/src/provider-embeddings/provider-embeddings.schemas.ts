import { v1EmbeddingsSchema } from "@shiguang-gateway/core-domain/edge/embeddings-validation-schemas";

/**
 * Request validation for the provider-scoped embeddings endpoint.
 *
 * The wire schema is shared with `/v1/embeddings`; provider resolution and
 * prefix validation remain local to this edge app's handler.
 */
export const providerEmbeddingsSchema = v1EmbeddingsSchema;

