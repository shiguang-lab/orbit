import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation-helpers";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { IssueAgentService, RecordedTriageTimeoutError } from "./issue-agent.service.js";

const schema = z.object({ mode: z.string().optional(), issueUrl: z.string().optional(), dryRun: z.boolean().optional(), model: z.string().min(1).max(256).optional(), provider: z.string().min(1).max(128).optional(), routingPolicy: z.string().min(1).max(128).optional(), timeoutMs: z.number().int().min(1).max(120_000).optional(), recordedContext: z.unknown().optional(), githubExport: z.unknown().optional() });
const enabled = () => new Set(["1", "true", "yes", "on"]).has((process.env.SHIGUANG_GATEWAY_ISSUE_AGENT_ENABLED ?? "").toLowerCase());

@Controller("api/issue-agent")
export class IssueAgentController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: IssueAgentService) {}
  @Get("runs")
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, async () => Response.json({ ok: true, enabled: enabled(), supportedModes: ["recorded-triage"], execution: "disabled-by-default" })); }
  @Post("runs")
  post(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      let body: unknown; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
      const validation = validateBody(schema, body); if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
      const parsed = validation.data;
      if (parsed.mode !== "recorded-triage") return Response.json({ error: "Unsupported issue-agent mode", supportedModes: ["recorded-triage"] }, { status: 400 });
      if (!enabled()) return Response.json({ error: "Issue Agent execution is disabled", enabled: false, requiredEnv: "SHIGUANG_GATEWAY_ISSUE_AGENT_ENABLED=true" }, { status: 403 });
      try {
        const normalized = parsed.githubExport ? this.service.normalize(parsed.githubExport) : null;
        const run = this.service.create({ ...parsed, issueUrl: parsed.issueUrl ?? normalized?.issueUrl, recordedContext: parsed.recordedContext ?? normalized?.recordedContext });
        const audit = await this.service.append(run);
        if (run.dryRun) return Response.json({ ...run, auditPath: audit.path });
        const completion = await this.service.execute({ run, model: parsed.model, provider: parsed.provider, routingPolicy: parsed.routingPolicy, timeoutMs: parsed.timeoutMs });
        return Response.json({ ...run, runner: "shiguangGateway-chat-completions", auditPath: audit.path, completion: completion.body }, { status: completion.status });
      } catch (error) {
        if (error instanceof RecordedTriageTimeoutError) return Response.json({ error: sanitizeErrorMessage(error.message), code: "ISSUE_AGENT_TIMEOUT" }, { status: 504 });
        return Response.json({ error: sanitizeErrorMessage(error instanceof Error ? error.message : "Invalid issue-agent request") }, { status: 400 });
      }
    });
  }
}
