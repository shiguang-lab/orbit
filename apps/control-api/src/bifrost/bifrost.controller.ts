import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { z } from "zod";
import { BifrostService } from "./bifrost.service.js";

const InstallBody = z.object({
  version: z.string().regex(/^[A-Za-z0-9._+-]+$/, "Invalid version").optional().default("latest"),
});
const ToggleBody = z.object({ enabled: z.boolean() });

@Controller("api/services/bifrost")
export class BifrostController {
  constructor(private readonly bifrost: BifrostService) {}

  @Post("install")
  async install(@Body() body: unknown, @Res() reply: FastifyReply) {
    const parsed = InstallBody.safeParse(body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return this.run(reply, async () => ({ ok: true, ...(await this.bifrost.install(parsed.data.version)) }));
  }

  @Get("status")
  status(@Res() reply: FastifyReply) {
    return this.run(reply, () => this.bifrost.status());
  }

  @Post("start")
  start(@Res() reply: FastifyReply) {
    return this.run(reply, () => this.bifrost.start());
  }

  @Post("stop")
  stop(@Res() reply: FastifyReply) {
    return this.run(reply, () => this.bifrost.stop());
  }

  @Post("restart")
  restart(@Res() reply: FastifyReply) {
    return this.run(reply, () => this.bifrost.restart());
  }

  @Post("update")
  update(@Res() reply: FastifyReply) {
    return this.run(reply, () => this.bifrost.update());
  }

  @Post("auto-start")
  autoStart(@Body() body: unknown, @Res() reply: FastifyReply) {
    return this.toggle(body, reply, (enabled) => this.bifrost.setAutoStart(enabled));
  }

  @Post("auto-restart-adopted")
  autoRestartAdopted(@Body() body: unknown, @Res() reply: FastifyReply) {
    return this.toggle(body, reply, (enabled) => this.bifrost.setAutoRestartAdopted(enabled));
  }

  private async toggle(
    body: unknown,
    reply: FastifyReply,
    action: (enabled: boolean) => Promise<unknown>,
  ) {
    const parsed = ToggleBody.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    try {
      await action(parsed.data.enabled);
      return reply.status(204).send();
    } catch (error) {
      return this.sendError(reply, error, 500);
    }
  }

  private async run(reply: FastifyReply, action: () => Promise<unknown>) {
    try {
      return reply.send(await action());
    } catch (error: any) {
      return this.sendError(reply, error, typeof error?.statusCode === "number" ? error.statusCode : 500);
    }
  }

  private sendError(reply: FastifyReply, error: unknown, status: number) {
    return reply.status(status).send({ error: sanitizeErrorMessage(error) });
  }
}
