import { isAuthenticated } from "@orbit/core/control/authenticated";
import { getCliproxyAccountHealth } from "@orbit/core/control/cliproxy";

export async function accounts(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getCliproxyAccountHealth(), { headers: { "Cache-Control": "no-store" } });
}
