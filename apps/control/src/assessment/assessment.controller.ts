import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AssessmentService } from "./assessment.service.js";

@Controller("api/assess")
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}
  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return reply.send(this.assessment.list(`${request.protocol}://${request.hostname}${request.raw.url ?? "/api/assess"}`));
  }
  @Post()
  async run(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    try {
      const result = await this.assessment.run(request.body);
      return reply.status(result.status).send(result.payload);
    } catch (error) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
}
