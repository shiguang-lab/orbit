import { z } from "zod";
import { addGroupPermission, getGroupPermissions, getKeyGroup, removeGroupPermission } from "@orbit/core/db/api-key-groups";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { json } from "./response.js";
type RouteParams = { params: { id: string } };
const addGroupPermissionSchema = z.object({ modelPattern: z.string().trim().min(1, "modelPattern is required"), accessType: z.enum(["allow", "deny"]), provider: z.string().trim().min(1).optional() });

export async function GET(_request: Request, { params }: RouteParams) {
  try { const { id } = params; if (!getKeyGroup(id)) return json({ error: "Group not found" }, { status: 404 }); return json({ permissions: getGroupPermissions(id) }); }
  catch { return json({ error: "Failed to list permissions" }, { status: 500 }); }
}
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    if (!getKeyGroup(id)) return json({ error: "Group not found" }, { status: 404 });
    const validation = validateBody(addGroupPermissionSchema, await request.json());
    if (isValidationFailure(validation)) return json({ error: validation.error }, { status: 400 });
    const { modelPattern, accessType, provider } = validation.data;
    return json({ permission: addGroupPermission(id, modelPattern, accessType, provider) }, { status: 201 });
  } catch { return json({ error: "Failed to add permission" }, { status: 500 }); }
}
export async function DELETE(request: Request, _context: RouteParams) {
  try {
    const permissionId = new URL(request.url).searchParams.get("permissionId");
    if (!permissionId) return json({ error: "permissionId query param required" }, { status: 400 });
    if (!removeGroupPermission(permissionId)) return json({ error: "Permission not found" }, { status: 404 });
    return json({ success: true });
  } catch { return json({ error: "Failed to remove permission" }, { status: 500 }); }
}
