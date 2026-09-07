import { Body, Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { edgeRuntimeCommandSchema } from "@orbit/contracts/edge-runtime-command";
import {
  INTERNAL_SERVICE_AUTH_HEADER,
  isInternalServiceRequest,
} from "@orbit/auth/internal-service";
import { RuntimeControlService } from "./runtime-control.service.js";

@Controller("api/internal/runtime")
export class RuntimeControlController {
  constructor(@Inject(RuntimeControlService) private readonly runtime: RuntimeControlService) {}

  @Post("command")
  async command(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const provided = request.headers[INTERNAL_SERVICE_AUTH_HEADER.toLowerCase()];
    const headers = new Headers();
    if (typeof provided === "string") headers.set(INTERNAL_SERVICE_AUTH_HEADER, provided);
    if (!isInternalServiceRequest(new Request("http://edge.internal/", { headers }))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const parsed = edgeRuntimeCommandSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid edge runtime command" });

    try {
      return reply.send(await this.runtime.execute(parsed.data));
    } catch (error) {
      console.error("[edge-runtime] command failed:", error);
      return reply.status(500).send({ error: "Edge runtime command failed" });
    }
  }
}
