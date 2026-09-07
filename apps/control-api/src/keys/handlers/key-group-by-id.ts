import { z } from "zod";
import { deleteKeyGroup, getGroupMembers, getKeyGroupWithPermissions, updateKeyGroup } from "@shiguang-gateway/core-domain/db/api-key-groups";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { json } from "./response.js";

const updateKeyGroupSchema = z.object({ name: z.string().trim().min(1, "name cannot be empty").optional(), description: z.string().optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "At least one update field is required");
type RouteParams = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteParams) {
  try { const { id } = params; const group = getKeyGroupWithPermissions(id); if (!group) return json({ error: "Group not found" }, { status: 404 }); return json({ group, members: getGroupMembers(id) }); }
  catch { return json({ error: "Failed to get group" }, { status: 500 }); }
}
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const validation = validateBody(updateKeyGroupSchema, await request.json());
    if (isValidationFailure(validation)) return json({ error: validation.error }, { status: 400 });
    const group = updateKeyGroup(id, validation.data);
    if (!group) return json({ error: "Group not found" }, { status: 404 });
    return json({ group });
  } catch { return json({ error: "Failed to update group" }, { status: 500 }); }
}
export async function DELETE(_request: Request, { params }: RouteParams) {
  try { const { id } = params; if (!deleteKeyGroup(id)) return json({ error: "Group not found" }, { status: 404 }); return json({ success: true }); }
  catch { return json({ error: "Failed to delete group" }, { status: 500 }); }
}
