import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service.js";

function readCookie(req: FastifyRequest, name: string): string | null {
  const header = (req.headers.cookie as string) ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

@Controller("api/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const token = readCookie(request, "auth_token");
    const authenticated = await this.authService.verifyAuthToken(token);
    return reply.send({ authenticated });
  }
}
