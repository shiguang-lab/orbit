import { getCachedSettings, getTaskManager } from "@shiguang-gateway/core-domain/a2a/runtime";
import { AgentCardService } from "../../agent-card/agent-card.service.js";

export async function GET(request: Request) {
  try {
    const [settings, stats] = await Promise.all([
      getCachedSettings(),
      Promise.resolve(getTaskManager().getStats()),
    ]);
    const enabled = settings.a2aEnabled === true;

    let agentCard: any = null;
    if (enabled) {
      try {
        const cardResponse = await new AgentCardService().get(request, "0.3");
        agentCard = await cardResponse.json();
      } catch {
        agentCard = null;
      }
    }

    return Response.json({
      status: enabled ? "ok" : "disabled",
      online: enabled,
      enabled,
      tasks: stats,
      agent: agentCard
        ? {
            name: agentCard.name,
            description: agentCard.description,
            version: agentCard.version,
            url: agentCard.url,
          }
        : null,
      capabilities: agentCard?.capabilities || null,
      skills: Array.isArray(agentCard?.skills) ? agentCard.skills : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load A2A status";
    return Response.json({ error: message }, { status: 500 });
  }
}
