import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getApiKeys } from "@shiguang-gateway/core-domain/db/api-keys";
import { maskStoredApiKey } from "@shiguang-gateway/core-domain/control/api-key-exposure";

// GET /api/cli-tools/keys - List API keys with raw values for authenticated CLI tools UI only
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const keys = await getApiKeys();
    const cliToolKeys = keys.map((key) => ({
      ...key,
      rawKey: key.key,
      key: maskStoredApiKey(key.key),
    }));
    return Response.json({ keys: cliToolKeys, total: cliToolKeys.length });
  } catch (error) {
    console.log("Error fetching CLI tool keys:", error);
    return Response.json({ error: "Failed to fetch CLI tool keys" }, { status: 500 });
  }
}
