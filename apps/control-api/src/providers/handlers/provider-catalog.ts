import {
  getDashboardProviderCatalog,
  requireManagementAuth,
} from "@orbit/core/control/provider-management";

export async function getProviderCatalog(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  return Response.json(getDashboardProviderCatalog());
}
