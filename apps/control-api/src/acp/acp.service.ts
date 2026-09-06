import { Injectable } from "@nestjs/common";
import {
  detectInstalledAgents,
  refreshAgentCache,
  resolveVersionProbe,
  setCustomAgents,
  type CliAgentInfo,
  type CustomAgentDef,
} from "@shiguang-gateway/core-domain/control/acp";
import { getSettings, updateSettings } from "@shiguang-gateway/core-domain/control/settings";

@Injectable()
export class AcpService {
  async list() {
    const settings = await getSettings();
    if (settings.customAgents) setCustomAgents(settings.customAgents as CustomAgentDef[]);
    const agents = detectInstalledAgents();
    const installed = agents.filter((agent: CliAgentInfo) => agent.installed).length;
    const total = agents.length;
    return {
      agents,
      summary: {
        total,
        installed,
        notFound: total - installed,
        builtIn: agents.filter((agent: CliAgentInfo) => !agent.isCustom).length,
        custom: agents.filter((agent: CliAgentInfo) => agent.isCustom).length,
      },
    };
  }

  refresh() {
    return { agents: refreshAgentCache(), refreshed: true };
  }

  async add(input: Record<string, unknown>) {
    const id = typeof input.id === "string" ? input.id : undefined;
    const name = typeof input.name === "string" ? input.name : undefined;
    const binary = typeof input.binary === "string" ? input.binary : undefined;
    const versionCommand = typeof input.versionCommand === "string" ? input.versionCommand : undefined;
    if (!id || !name || !binary || !versionCommand) {
      return { status: 400, body: { error: "Missing required fields: id, name, binary, versionCommand" } };
    }
    const providerAlias = typeof input.providerAlias === "string" ? input.providerAlias : undefined;
    const spawnArgs = Array.isArray(input.spawnArgs) && input.spawnArgs.every((arg) => typeof arg === "string")
      ? input.spawnArgs as string[]
      : [];
    const protocol = input.protocol === "http" ? "http" : "stdio";
    const newAgent: CustomAgentDef = {
      id: id.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      name,
      binary,
      versionCommand,
      providerAlias: providerAlias || id,
      spawnArgs,
      protocol,
    };
    if (!resolveVersionProbe(newAgent.binary, newAgent.versionCommand, true)) {
      return { status: 400, body: { error: "Invalid versionCommand: use the configured binary with plain arguments only" } };
    }
    const settings = await getSettings();
    const current = (settings.customAgents as CustomAgentDef[] | undefined) || [];
    if (current.some((agent) => agent.id === newAgent.id)) {
      return { status: 409, body: { error: `Agent with id '${newAgent.id}' already exists` } };
    }
    const updated = [...current, newAgent];
    await updateSettings({ customAgents: updated });
    setCustomAgents(updated);
    return { status: 200, body: { agents: refreshAgentCache(), added: newAgent } };
  }

  async remove(agentId: string | null) {
    if (!agentId) return { status: 400, body: { error: "Missing agent id" } };
    const settings = await getSettings();
    const current = (settings.customAgents as CustomAgentDef[] | undefined) || [];
    const updated = current.filter((agent) => agent.id !== agentId);
    if (updated.length === current.length) {
      return { status: 404, body: { error: `Agent '${agentId}' not found in custom agents` } };
    }
    await updateSettings({ customAgents: updated });
    setCustomAgents(updated);
    return { status: 200, body: { agents: refreshAgentCache(), removed: agentId } };
  }
}
