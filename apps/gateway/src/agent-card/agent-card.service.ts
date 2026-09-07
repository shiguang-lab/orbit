import { Injectable } from "@nestjs/common";
import { getFleetSkills } from "./fleet-skills.js";

type AgentCardRequest = Pick<Request, "headers">;

@Injectable()
export class AgentCardService {
  private async fleetSkills(): Promise<readonly { id: string; name: string; description: string; tags: string[] }[]> {
    return getFleetSkills();
  }

  private baseUrl(request: AgentCardRequest): string {
    if (process.env.ORBIT_BASE_URL) return process.env.ORBIT_BASE_URL;
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "127.0.0.1:8787";
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`;
  }

  async get(request: AgentCardRequest, version: "0.3" | "1.0"): Promise<Response> {
    const baseUrl = this.baseUrl(request);
    const fleetSkills = await this.fleetSkills();
    const versionValue = process.env.npm_package_version || "1.8.1";
    const commonSkills = [
      {
        id: "smart-routing",
        name: version === "1.0" ? "Smart Request Routing" : "智能请求路由",
        description:
          version === "1.0"
            ? "Routes AI requests to the optimal provider based on quota, cost, latency, and reliability."
            : "基于配额、成本、延迟和可靠性将 AI 请求路由到最优提供者。支持基于组合的路由，包含多种策略：优先级、加权、轮询、成本优化。",
        tags: ["routing", "llm", "optimization", "fallback"],
        examples: version === "1.0" ? ["Route this coding task to the fastest available model", "Send this review to an analytical model under a $0.50 budget"] : ["将此编码任务路由到最快的可用模型", "将此次审查发送给预算 $0.50 以下的分析模型", "查找有可用配额的最便宜提供者"],
      },
      {
        id: "quota-management",
        name: version === "1.0" ? "Quota & Cost Management" : "配额与成本管理",
        description: version === "1.0" ? "Tracks and manages API quotas across providers with auto-fallback when quotas are exhausted." : "跨 36+ 个提供者跟踪和管理 API 配额，配额耗尽时自动回退。提供实时成本跟踪和预算执行。",
        tags: ["quota", "cost", "monitoring", "budget"],
        examples: version === "1.0" ? ["Check remaining quota for all providers", "Generate a cost report for today"] : ["检查所有提供者的剩余配额", "哪个提供者有最多可用配额？", "生成今天的成本报告"],
      },
      {
        id: "provider-discovery",
        name: version === "1.0" ? "Provider Discovery" : "提供者发现",
        description: version === "1.0" ? "Discovers providers that can handle a requested capability (chat, images, audio, search, embeddings, rerank, video)." : "发现能够处理请求能力的提供者，如聊天、图像、音频、搜索、嵌入、重排序或视频。报告可用性、健康状态、配置状态和推荐提供者。",
        tags: ["providers", "discovery", "capabilities", "health"],
        examples: version === "1.0" ? ["Which providers can handle image generation?", "Find healthy providers for embeddings"] : ["哪些提供者可以处理图像生成？", "查找健康的嵌入提供者", "哪些本地提供者已配置？"],
      },
      {
        id: "cost-analysis",
        name: version === "1.0" ? "Cost Analysis" : "成本分析",
        description: version === "1.0" ? "Analyzes usage costs by provider and model and returns cost-saving opportunities." : "按提供者和模型分析使用成本，比较最近时段，并返回可供代理执行的成本节省机会。",
        tags: ["cost", "usage", "analytics", "optimization"],
        examples: version === "1.0" ? ["How much did we spend this week?", "Which provider costs the most?"] : ["这周花了多少钱？", "哪个提供者花费最多？", "建议过去 30 天的成本节省机会"],
      },
      {
        id: "health-report",
        name: version === "1.0" ? "Health Report" : "健康报告",
        description: version === "1.0" ? "Summarizes provider health, circuit-breaker state, rate-limit queues, and telemetry into a structured report." : "将提供者健康状态、断路器状态、速率限制队列、锁定和遥测汇总为结构化报告，供编排使用。",
        tags: ["health", "monitoring", "resilience", "telemetry"],
        examples: version === "1.0" ? ["Is everything healthy?", "Report degraded providers and retry timing"] : ["一切都健康吗？", "报告降级的提供者和重试时机", "汇总活跃的速率限制和锁定"],
      },
      {
        id: "list-capabilities",
        name: version === "1.0" ? "List Capabilities" : "列出能力",
        description: version === "1.0" ? "Returns the full catalog of Orbit agent skills." : "返回 42 个 Orbit 代理技能的完整目录（22 API + 20 CLI）以及 SKILL.md 文档的原始 URL。",
        tags: ["discovery", "capabilities"],
        examples: version === "1.0" ? ["What can you do?", "List your skills"] : ["你能做什么？", "列出你的技能", "展示能力"],
      },
      ...fleetSkills,
    ];
    const card = version === "1.0"
      ? {
          name: "Orbit AI Gateway",
          description: "Intelligent AI routing gateway with 36+ providers, smart fallback, quota tracking, format translation, and auto-managed combos. Routes AI requests to the optimal provider based on cost, latency, quota availability, and task requirements.",
          url: `${baseUrl}/a2a`, version: versionValue,
          supportedInterfaces: [{ url: `${baseUrl}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "1.0" }, { url: `${baseUrl}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "0.3" }],
          defaultInputModes: ["text/plain"], defaultOutputModes: ["text/plain"], capabilities: { streaming: true, pushNotifications: false }, skills: commonSkills,
          security: { schemes: ["api-key"], apiKeyHeader: "Authorization" },
        }
      : {
          name: "Orbit AI 网关",
          description: "智能 AI 路由网关，支持 36+ 个提供者、智能回退、配额跟踪、格式转换和自动管理组合。根据成本、延迟、配额可用性和任务要求将 AI 请求路由到最优提供者。",
          url: `${baseUrl}/a2a`, version: versionValue, capabilities: { streaming: true, pushNotifications: false }, skills: commonSkills,
          authentication: { schemes: ["api-key"], apiKeyHeader: "Authorization" },
        };
    return Response.json(card, { headers: { "Cache-Control": "public, max-age=3600", "Content-Type": "application/json" } });
  }
}
