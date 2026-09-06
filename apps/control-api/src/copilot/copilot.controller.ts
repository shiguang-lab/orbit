import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation-helpers";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CopilotService } from "./copilot.service.js";

const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1, "message content is required") })).min(1, "messages array is required") });

@Controller("api/copilot")
export class CopilotController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: CopilotService) {}

  @Post("chat")
  chat(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      const authError = await requireManagementAuth(request);
      if (authError) return authError;
      try {
        const validation = validateBody(schema, await request.json());
        if (isValidationFailure(validation)) return Response.json(buildErrorBody(400, validation.error), { status: 400 });
        return Response.json(await this.service.process(validation.data));
      } catch (error) {
        return Response.json(buildErrorBody(500, `Copilot error: ${sanitizeErrorMessage(error)}`), { status: 500 });
      }
    });
  }
}
