import { getModelAliases } from "@shiguang-gateway/core-domain/db/model-aliases";
import { getProviderConnections } from "@shiguang-gateway/core-domain/db/provider-connections";
import { validateApiKey } from "@shiguang-gateway/core-domain/db/api-keys";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing API key" }, { status: 401 });
    }
    const isValid = await validateApiKey(authHeader.slice(7));
    if (!isValid) return Response.json({ error: "Invalid API key" }, { status: 401 });

    const connections = await getProviderConnections({ isActive: true });
    const maskSecret = (value: unknown): string | null => {
      if (typeof value !== "string" || !value) return null;
      return value.length <= 8 ? "****" : `${value.slice(0, 4)}****${value.slice(-4)}`;
    };
    const mappedConnections = connections.map((conn: any) => ({
      provider: conn.provider,
      authType: conn.authType,
      hasApiKey: !!conn.apiKey,
      hasAccessToken: !!conn.accessToken,
      hasRefreshToken: !!conn.refreshToken,
      maskedApiKey: maskSecret(conn.apiKey),
      projectId: conn.projectId || null,
      expiresAt: conn.expiresAt,
      priority: conn.priority,
      globalPriority: conn.globalPriority,
      defaultModel: conn.defaultModel,
      isActive: conn.isActive,
    }));
    return Response.json({ connections: mappedConnections, modelAliases: await getModelAliases() });
  } catch (error) {
    console.log("Cloud auth error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
