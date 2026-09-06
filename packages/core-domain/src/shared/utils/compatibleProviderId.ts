/**
 * Single source of truth for recognizing a "compatible provider" connection
 * ID — the dynamic IDs generated for openai-compatible / anthropic-compatible
 * custom nodes (src/app/api/provider-nodes/route.ts).
 *
 * Generated shapes (all four must match):
 *   - openai-compatible-chat-<uuid>
 *   - openai-compatible-responses-<uuid>
 *   - anthropic-compatible-<uuid>
 *   - anthropic-compatible-cc-<uuid>
 *
 * The implementation lives in the transport-neutral contracts package so
 * edge routing and the provider catalog share one validator without creating
 * a core-domain/open-sse package cycle. See #8326: the previous inline regex
 * required a literal "-chat-" segment, rejecting 3 of the 4 generated shapes.
 *
 * @module shared/utils/compatibleProviderId
 */

export { isCompatibleProviderConnectionId } from "@shiguang-gateway/contracts/compatible-provider-id";
