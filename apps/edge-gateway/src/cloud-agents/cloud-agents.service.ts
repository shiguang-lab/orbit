import { Injectable } from "@nestjs/common";

type JsonModule = Record<string, any>;
const load = (specifier: string): Promise<JsonModule> => import(specifier as string);

type ProviderHealth = {
  id: string;
  name: string;
  connected: boolean;
  latencyMs: number;
  error?: string;
};

const PROVIDER_NAMES: Record<string, string> = {
  jules: "Jules",
  devin: "Devin",
  "codex-cloud": "Codex Cloud",
  "cursor-cloud": "Cursor Cloud",
};

@Injectable()
export class CloudAgentsService {
  async healthOptions(request: Request): Promise<Response> {
    const { getCloudAgentCorsHeaders } = await import("./domain/health.js");
    return new Response(null, { headers: getCloudAgentCorsHeaders(request) });
  }

  async health(request: Request): Promise<Response> {
    const [cloudAgent, errors] = await Promise.all([
      import("./domain/health.js"),
      load("@shiguang-gateway/open-sse/utils/error"),
    ]);

    try {
      const authError = await cloudAgent.requireCloudAgentManagementAuth(request);
      if (authError) return authError;

      const checkProviderHealth = async (providerId: string): Promise<ProviderHealth> => {
        const name = PROVIDER_NAMES[providerId] ?? providerId;
        const agent = cloudAgent.getAgent(providerId);
        if (!agent) {
          return { id: providerId, name, connected: false, latencyMs: 0, error: "Unknown provider" };
        }

        const credentials = cloudAgent.getCloudAgentCredentialFromDb(providerId);
        if (!credentials) {
          return {
            id: providerId,
            name,
            connected: false,
            latencyMs: 0,
            error: "No credentials configured",
          };
        }

        const start = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Connection timed out")), 5000);
          });
          await Promise.race([agent.listSources(credentials), timeoutPromise]);
          return { id: providerId, name, connected: true, latencyMs: Date.now() - start };
        } catch (error) {
          return {
            id: providerId,
            name,
            connected: false,
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      };

      const results = await Promise.all(
        cloudAgent.getAvailableAgents().map((providerId: string) => checkProviderHealth(providerId)),
      );
      return Response.json(
        { providers: results },
        { headers: cloudAgent.getCloudAgentCorsHeaders(request) },
      );
    } catch (error) {
      const message =
        errors.sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
        "Internal server error";
      return Response.json(
        { error: message },
        { status: 500, headers: cloudAgent.getCloudAgentCorsHeaders(request) },
      );
    }
  }
}
