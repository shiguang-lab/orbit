import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CopilotService } from "./copilot.service.js";

const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1, "message content is required") })).min(1, "messages array is required") });

@Controller("api/copilot")
export class CopilotController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CopilotService) private readonly service: CopilotService,
  ) {}

  @Post("chat")
  chat(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, async (request) => {
      const authError = await requireManagementAuth(request);
      if (authError) return authError;
      try {
        const validation = validateBody(schema, await request.json());
        if (isValidationFailure(validation)) {
          return Response.json(buildErrorBody(400, validation.error.message, validation.error), {
            status: 400,
          });
        }
        return Response.json(await this.service.process(validation.data));
      } catch (error) {
        return Response.json(buildErrorBody(500, `Copilot error: ${sanitizeErrorMessage(error)}`), { status: 500 });
      }
    });
  }
}
