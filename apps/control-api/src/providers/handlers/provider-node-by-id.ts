import {
  deleteProviderNode,
  getProviderNodeById,
  updateProviderNode,
} from "@orbit/core/db/provider-nodes";
import {
  deleteProviderConnectionsByProvider,
  getProviderConnections,
  updateProviderConnection,
} from "@orbit/core/db/provider-connections";
import { deleteModelAliasesForProvider } from "@orbit/core/db/model-aliases";
import { isClaudeCodeCompatibleProvider } from "@orbit/providers/catalog";
import { updateProviderNodeSchema } from "@orbit/core/control/provider-validation-schemas";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { validateProviderNodeBaseUrl } from "./provider-nodes-url-guard.js";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function sanitizeAnthropicBaseUrl(baseUrl: string) {
  return (baseUrl || "")
    .trim()
    .replace(/\/$/, "")
    .replace(/\/messages(?:\?[^#]*)?$/i, "");
}

function sanitizeClaudeCodeCompatibleBaseUrl(baseUrl: string) {
  return (baseUrl || "")
    .trim()
    .replace(/\/$/, "")
    .replace(/\/(?:v\d+\/)?messages(?:\?[^#]*)?$/i, "");
}

// PUT /api/provider-nodes/[id] - Update provider node
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  try {
    const { id } = params;
    const validation = validateBody(updateProviderNodeSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { name, prefix, apiType, baseUrl, chatPath, modelsPath, customHeaders, iconUrl } =
      validation.data;
    const node: any = await getProviderNodeById(id);

    if (!node) {
      return Response.json({ error: "Provider node not found" }, { status: 404 });
    }

    // Only validate apiType for OpenAI Compatible nodes
    const validApiTypes = [
      "chat",
      "responses",
      "embeddings",
      "audio-transcriptions",
      "audio-speech",
      "images-generations",
    ];
    if (node.type === "openai-compatible" && (!apiType || !validApiTypes.includes(apiType))) {
      return Response.json({ error: "Invalid OpenAI compatible API type" }, { status: 400 });
    }

    let sanitizedBaseUrl = baseUrl.trim();

    // Sanitize Base URL for Anthropic Compatible
    if (node.type === "anthropic-compatible") {
      sanitizedBaseUrl = isClaudeCodeCompatibleProvider(id)
        ? sanitizeClaudeCodeCompatibleBaseUrl(sanitizedBaseUrl)
        : sanitizeAnthropicBaseUrl(sanitizedBaseUrl);
    }
    const baseUrlError = validateProviderNodeBaseUrl(sanitizedBaseUrl);
    if (baseUrlError) return baseUrlError;

    const updates: Record<string, unknown> = {
      name: name.trim(),
      prefix: prefix.trim(),
      baseUrl: sanitizedBaseUrl,
      chatPath: chatPath || null,
      modelsPath: isClaudeCodeCompatibleProvider(id) ? null : modelsPath || null,
      // #2166: explicit null (not omission) so an empty submission clears a
      // previously stored custom icon.
      iconUrl: iconUrl?.trim() || null,
      customHeaders: customHeaders || null,
    };

    if (node.type === "openai-compatible") {
      updates.apiType = apiType;
    }

    const updated = await updateProviderNode(id, updates);

    const connections = await getProviderConnections({ provider: id });
    await Promise.all(
      connections.flatMap((connectionRaw) => {
        const connection = asRecord(connectionRaw);
        const connectionId = typeof connection.id === "string" ? connection.id : "";
        if (!connectionId) return [];

        const providerSpecificData = {
          ...asRecord(connection.providerSpecificData),
          prefix: prefix.trim(),
          baseUrl: sanitizedBaseUrl,
          nodeName: updated.name,
          chatPath: updated.chatPath || undefined,
          customHeaders: updated.customHeaders || undefined,
        } as JsonRecord;
        if (updated.modelsPath) {
          providerSpecificData.modelsPath = updated.modelsPath;
        } else {
          delete providerSpecificData.modelsPath;
        }
        if (node.type === "openai-compatible") {
          providerSpecificData.apiType = apiType;
        }

        return [
          updateProviderConnection(connectionId, {
            providerSpecificData,
          }),
        ];
      })
    );

    return Response.json({ node: updated });
  } catch (error) {
    console.log("Error updating provider node:", error);
    return Response.json({ error: "Failed to update provider node" }, { status: 500 });
  }
}

// DELETE /api/provider-nodes/[id] - Delete provider node and its connections
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const node = await getProviderNodeById(id);

    if (!node) {
      return Response.json({ error: "Provider node not found" }, { status: 404 });
    }

    await deleteProviderConnectionsByProvider(id);
    await deleteProviderNode(id);
    // #1409: drop orphaned model-alias rows (key=<alias>, value="<providerId>/<model>")
    // so re-importing the same provider isn't blocked by stale "already exists" aliases.
    await deleteModelAliasesForProvider(id);

    return Response.json({ success: true });
  } catch (error) {
    console.log("Error deleting provider node:", error);
    return Response.json({ error: "Failed to delete provider node" }, { status: 500 });
  }
}
