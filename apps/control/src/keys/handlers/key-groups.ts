import { z } from "zod";
import { createKeyGroup, getAllKeyGroups } from "@orbit/core/db/api-key-groups";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { json } from "./response.js";

const createKeyGroupSchema = z.object({ name: z.string().trim().min(1, "name is required"), description: z.string().optional().default("") });

export async function GET() {
  try { return json({ groups: getAllKeyGroups() }); }
  catch { return json({ error: "Failed to list groups" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const validation = validateBody(createKeyGroupSchema, await request.json());
    if (isValidationFailure(validation)) return json({ error: validation.error }, { status: 400 });
    return json({ group: createKeyGroup(validation.data.name, validation.data.description) }, { status: 201 });
  } catch { return json({ error: "Failed to create group" }, { status: 500 }); }
}
