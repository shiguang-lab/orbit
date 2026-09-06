import { z } from "zod";
import {
  createModelComboMapping,
  deleteModelComboMapping,
  getModelComboMappingById,
  getModelComboMappings,
  updateModelComboMapping,
} from "@shiguang-gateway/core-domain/db/local-db";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { json } from "./response.js";

const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

const createMappingSchema = z.object({
  pattern: z.string().min(1, "Pattern is required").max(500),
  comboId: z.string().min(1, "ComboId is required"),
  priority: z.number().int().optional().default(0),
  enabled: z.boolean().optional().default(true),
  description: z.string().max(1000).optional().default(""),
});

const updateMappingSchema = z.object({
  pattern: z.string().min(1).max(500).optional(),
  comboId: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(1000).optional(),
});

type RouteContext = { params: Record<string, string> };

async function managementError(request: Request): Promise<Response | null> {
  return requireManagementAuth(request);
}

export async function list(request: Request): Promise<Response> {
  const authError = await managementError(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const validation = paginationSchema.safeParse({
      offset: url.searchParams.get("offset") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!validation.success) {
      return json({ error: validation.error.issues[0]?.message ?? "Invalid pagination" }, { status: 400 });
    }
    const result = await getModelComboMappings(validation.data);
    return json({ mappings: result.items, total: result.total });
  } catch (error: unknown) {
    console.error("Failed to list model-combo mappings:", error);
    return json({ error: "Failed to list model-combo mappings" }, { status: 500 });
  }
}

export async function create(request: Request): Promise<Response> {
  const authError = await managementError(request);
  if (authError) return authError;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return json(
        { error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } },
        { status: 400 },
      );
    }
    const validation = createMappingSchema.safeParse(rawBody);
    if (!validation.success) return json({ error: validation.error.format() }, { status: 400 });
    const mapping = await createModelComboMapping({
      ...validation.data,
      pattern: validation.data.pattern.trim(),
    });
    return json({ mapping }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create model-combo mapping:", error);
    return json({ error: "Failed to create model-combo mapping" }, { status: 500 });
  }
}

export async function getById(request: Request, context: RouteContext): Promise<Response> {
  const authError = await managementError(request);
  if (authError) return authError;
  try {
    const mapping = await getModelComboMappingById(context.params.id);
    if (!mapping) return json({ error: "Mapping not found" }, { status: 404 });
    return json({ mapping });
  } catch (error: unknown) {
    console.error("Failed to get model-combo mapping:", error);
    return json({ error: "Failed to get mapping" }, { status: 500 });
  }
}

export async function update(request: Request, context: RouteContext): Promise<Response> {
  const authError = await managementError(request);
  if (authError) return authError;
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return json(
        { error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } },
        { status: 400 },
      );
    }
    const validation = updateMappingSchema.safeParse(rawBody);
    if (!validation.success) return json({ error: validation.error.format() }, { status: 400 });
    const mapping = await updateModelComboMapping(context.params.id, validation.data);
    if (!mapping) return json({ error: "Mapping not found" }, { status: 404 });
    return json({ mapping });
  } catch (error: unknown) {
    console.error("Failed to update model-combo mapping:", error);
    return json({ error: "Failed to update mapping" }, { status: 500 });
  }
}

export async function remove(request: Request, context: RouteContext): Promise<Response> {
  const authError = await managementError(request);
  if (authError) return authError;
  try {
    const deleted = await deleteModelComboMapping(context.params.id);
    if (!deleted) return json({ error: "Mapping not found" }, { status: 404 });
    return json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete model-combo mapping:", error);
    return json({ error: "Failed to delete mapping" }, { status: 500 });
  }
}
