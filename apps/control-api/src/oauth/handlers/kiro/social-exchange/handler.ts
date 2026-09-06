// @ts-nocheck
import { z } from "zod";
import { KiroService } from "@shiguang-gateway/core-domain/control/oauth-runtime/services/kiro";
import {
  createProviderConnection,
  getProviderConnections,
  updateProviderConnection,
  isCloudEnabled,
} from "@shiguang-gateway/core-domain/control/models";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { syncToCloud } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { isAuthRequired, isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { KIRO_CONFIG } from "@shiguang-gateway/core-domain/control/oauth-runtime/constants/oauth";
import { findKiroConnectionByIdentity } from "@shiguang-gateway/core-domain/control/oauth-runtime/kiroConnectionIdentity";
import { classifyKiroSocialPoll } from "@shiguang-gateway/core-domain/control/oauth-runtime/kiroSocialPoll";

const socialExchangeSchema = z.object({
  deviceCode: z.string().min(1, "Missing deviceCode or provider"),
  provider: z.enum(["google", "github"]),
  targetProvider: z.enum(["kiro", "amazon-q"]).optional(),
});

/**
 * POST /api/oauth/kiro/social-exchange
 * Poll device code for tokens (Google/GitHub social login device flow).
 * Frontend calls this repeatedly until authorization completes.
 */
export async function POST(request: Request) {
  if ((await isAuthRequired(request)) && !(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  const validation = validateBody(socialExchangeSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json(
      { error: validation.error || "Missing deviceCode or provider" },
      { status: 400 }
    );
  }

  try {
    const { deviceCode, provider, targetProvider } = validation.data;

    const response = await fetch(KIRO_CONFIG.socialDevicePollUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceCode, clientId: KIRO_CONFIG.socialClientId }),
    });

    const data = await response.json();
    const poll = classifyKiroSocialPoll(response.ok, response.status, data);

    if (poll.kind === "pending") {
      return Response.json({
        success: false,
        pending: true,
        error: poll.error,
      });
    }

    if (poll.kind === "error") {
      return Response.json(
        {
          success: false,
          pending: false,
          error: poll.error,
        },
        { status: poll.status }
      );
    }

    const kiroService = new KiroService();
    const email = kiroService.extractEmailFromJWT(data.accessToken);

    const providerSpecificData: Record<string, any> = {
      authMethod: "imported",
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    };

    if (data.profileArn) {
      providerSpecificData.profileArn = data.profileArn;
    }

    const resolvedProvider = targetProvider || "kiro";
    const record = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString(),
      email: email || null,
      providerSpecificData,
      testStatus: "active",
      isActive: true,
    };
    const existing = await getProviderConnections({ provider: resolvedProvider });
    const match = findKiroConnectionByIdentity(existing, {
      authType: "oauth",
      profileArn: data.profileArn,
      email,
    });
    const connection: any =
      typeof match?.id === "string"
        ? await updateProviderConnection(match.id, record)
        : await createProviderConnection({
            provider: resolvedProvider,
            authType: "oauth",
            ...record,
          });

    await syncToCloudIfEnabled();

    return Response.json({
      success: true,
      connection: {
        id: connection.id,
        provider: connection.provider,
        email: connection.email,
      },
    });
  } catch (error: any) {
    console.error("Kiro social exchange error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function syncToCloudIfEnabled() {
  try {
    const cloudEnabled = await isCloudEnabled();
    if (!cloudEnabled) return;
    const machineId = await getConsistentMachineId();
    await syncToCloud(machineId);
  } catch (error) {
    console.log("Error syncing to cloud after Kiro OAuth:", error);
  }
}
