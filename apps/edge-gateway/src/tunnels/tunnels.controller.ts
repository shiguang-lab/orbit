import { Body, Controller, Inject, Post, Req, Res } from "@nestjs/common";
import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import { tunnelCommandSchema } from "@orbit/contracts/tunnel-command";
import {
  INTERNAL_SERVICE_AUTH_HEADER,
  isInternalServiceRequest,
} from "@orbit/auth/internal-service";
import { toPublicSafeTunnelError } from "@orbit/core/shared/public-safe-error";
import { TunnelsService } from "./tunnels.service.js";

@Controller("api/internal/tunnels")
export class TunnelsController {
  constructor(@Inject(TunnelsService) private readonly tunnels: TunnelsService) {}

  @Post("command")
  async command(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const provided = request.headers[INTERNAL_SERVICE_AUTH_HEADER.toLowerCase()];
    const headers = new Headers();
    if (typeof provided === "string") headers.set(INTERNAL_SERVICE_AUTH_HEADER, provided);
    if (!isInternalServiceRequest(new Request("http://edge.internal/", { headers }))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const parsed = tunnelCommandSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid tunnel command" });

    if (parsed.data.command !== "tailscale.install") {
      try {
        return reply.send(await this.tunnels.execute(parsed.data));
      } catch (error) {
        return reply.status(500).send(
          toPublicSafeTunnelError(error, "Tunnel command failed.", "internal/tunnels command"),
        );
      }
    }

    const installCommand = parsed.data;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const push = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        void this.tunnels.install(installCommand, (message) => push("progress", { message }))
          .then(() => push("done", { success: true }))
          .catch((error) => push("error", toPublicSafeTunnelError(
            error,
            "Failed to install Tailscale.",
            "internal/tunnels install",
          )))
          .finally(() => controller.close());
      },
    });

    return reply
      .header("Content-Type", "text/event-stream; charset=utf-8")
      .header("Cache-Control", "no-cache, no-transform")
      .header("Connection", "keep-alive")
      .send(Readable.fromWeb(stream as never));
  }
}
