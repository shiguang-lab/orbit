import { requireManagementAuth } from "./requireManagementAuth.ts";

export async function requireCliToolsAuth(request: Request): Promise<Response | null> {
  return requireManagementAuth(request);
}
