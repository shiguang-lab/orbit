import { z } from "zod";
import { addKeyToGroup, getGroupMembers, getKeyGroup, removeKeyFromGroup } from "@shiguang-gateway/core-domain/db/api-key-groups";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { json } from "./response.js";
type RouteParams = { params: Promise<{ id: string }> };
const addKeyToGroupSchema = z.object({ keyId: z.string().trim().min(1, "keyId is required") });

export async function GET(_request: Request, { params }: RouteParams) {
  try { const { id } = await params; if (!getKeyGroup(id)) return json({ error: "Group not found" }, { status: 404 }); return json({ members: getGroupMembers(id) }); }
  catch { return json({ error: "Failed to list members" }, { status: 500 }); }
}
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!getKeyGroup(id)) return json({ error: "Group not found" }, { status: 404 });
    const validation = validateBody(addKeyToGroupSchema, await request.json());
    if (isValidationFailure(validation)) return json({ error: validation.error }, { status: 400 });
    if (!addKeyToGroup(validation.data.keyId, id)) return json({ error: "Failed to add key" }, { status: 500 });
    return json({ success: true }, { status: 201 });
  } catch { return json({ error: "Failed to add key to group" }, { status: 500 }); }
}
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const keyId = new URL(request.url).searchParams.get("keyId");
    if (!keyId) return json({ error: "keyId query param required" }, { status: 400 });
    if (!removeKeyFromGroup(keyId, id)) return json({ error: "Key not found in group" }, { status: 404 });
    return json({ success: true });
  } catch { return json({ error: "Failed to remove key from group" }, { status: 500 }); }
}
