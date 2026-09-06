import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { toPublicSafeTunnelError } from "@shiguang-gateway/core-domain/shared/public-safe-error";
import { formatValidationMessage, isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { TunnelsService } from "./tunnels.service.js";

const cloudflaredActionSchema = z.object({ action: z.enum(["enable", "disable"]) });
const ngrokActionSchema = z.object({
  action: z.enum(["enable", "disable"]),
  authToken: z.string().optional(),
});
const tailscaleEnableSchema = z.object({
  sudoPassword: z.string().optional(),
  hostname: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
});
const tailscaleLoginSchema = z.object({ hostname: z.string().optional() });
const tailscaleSudoSchema = z.object({ sudoPassword: z.string().optional() });

/** HTTP transport for operator-managed public tunnel processes. */
@Controller("api/tunnels")
export class TunnelsController {
  constructor(private readonly tunnels: TunnelsService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(request.raw as unknown as Request)) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  private validate<T extends z.ZodTypeAny>(schema: T, body: unknown, reply: FastifyReply) {
    const result = validateBody(schema, body ?? {});
    if (isValidationFailure(result)) {
      reply.status(400).send({ error: formatValidationMessage(result.error) });
      return null;
    }
    return result.data;
  }

  @Get("cloudflared")
  async cloudflaredStatus(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.tunnels.cloudflaredStatus());
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to load the cloudflared tunnel status.", "tunnels/cloudflared GET"));
    }
  }

  @Post("cloudflared")
  async cloudflaredAction(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(cloudflaredActionSchema, body, reply);
    if (!parsed) return;
    try {
      const status = await this.tunnels.cloudflaredAction(parsed.action);
      return reply.send({ success: true, action: parsed.action, status });
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to update the cloudflared tunnel.", "tunnels/cloudflared POST"));
    }
  }

  @Get("ngrok")
  async ngrokStatus(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.tunnels.ngrokStatus());
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to load the ngrok tunnel status.", "tunnels/ngrok GET"));
    }
  }

  @Post("ngrok")
  async ngrokAction(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(ngrokActionSchema, body, reply);
    if (!parsed) return;
    try {
      const status = await this.tunnels.ngrokAction(parsed.action, parsed.authToken);
      return reply.send({ success: true, action: parsed.action, status });
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to update the ngrok tunnel.", "tunnels/ngrok POST"));
    }
  }

  @Get("tailscale")
  async tailscaleStatus(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.tunnels.tailscaleStatus());
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to load the Tailscale status.", "tunnels/tailscale GET"));
    }
  }

  @Get("tailscale/check")
  async tailscaleCheck(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(await this.tunnels.tailscaleCheck());
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to check the Tailscale state.", "tunnels/tailscale/check GET"));
    }
  }

  @Post("tailscale/enable")
  async tailscaleEnable(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(tailscaleEnableSchema, body, reply);
    if (!parsed) return;
    try {
      return reply.send(await this.tunnels.tailscaleEnable(parsed));
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to enable the Tailscale Funnel.", "tunnels/tailscale/enable POST"));
    }
  }

  @Post("tailscale/disable")
  async tailscaleDisable(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(tailscaleSudoSchema, body, reply);
    if (!parsed) return;
    try {
      return reply.send(await this.tunnels.tailscaleDisable(parsed));
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to disable the Tailscale Funnel.", "tunnels/tailscale/disable POST"));
    }
  }

  @Post("tailscale/login")
  async tailscaleLogin(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(tailscaleLoginSchema, body, reply);
    if (!parsed) return;
    try {
      return reply.send(await this.tunnels.tailscaleLogin(parsed));
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to start the Tailscale login.", "tunnels/tailscale/login POST"));
    }
  }

  @Post("tailscale/start-daemon")
  async tailscaleDaemon(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(tailscaleSudoSchema, body, reply);
    if (!parsed) return;
    try {
      await this.tunnels.tailscaleDaemon(parsed);
      return reply.send({ success: true, status: await this.tunnels.tailscaleStatus() });
    } catch (error) {
      return reply.status(500).send(toPublicSafeTunnelError(error, "Failed to start the Tailscale daemon.", "tunnels/tailscale/start-daemon POST"));
    }
  }

  @Post("tailscale/install")
  async tailscaleInstall(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = this.validate(tailscaleSudoSchema, body, reply);
    if (!parsed) return;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const pushEvent = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\\ndata: ${JSON.stringify(payload)}\\n\\n`));
        };
        void (async () => {
          try {
            await this.tunnels.tailscaleInstall(parsed, (message) => pushEvent("progress", { message }));
            pushEvent("done", { success: true, status: await this.tunnels.tailscaleStatus() });
          } catch (error) {
            pushEvent("error", toPublicSafeTunnelError(error, "Failed to install Tailscale.", "tunnels/tailscale/install POST"));
          } finally {
            controller.close();
          }
        })();
      },
    });
    return reply
      .header("Content-Type", "text/event-stream; charset=utf-8")
      .header("Cache-Control", "no-cache, no-transform")
      .header("Connection", "keep-alive")
      .send(Readable.fromWeb(stream as never));
  }
}
