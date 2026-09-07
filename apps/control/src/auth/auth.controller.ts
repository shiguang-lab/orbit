import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handleSession } from "@orbit/auth";
import { AuthService } from "./auth.service.js";

@Controller("api/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get("session")
  async session(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return handleSession(request, reply);
  }

  @Get("csrf")
  async csrf(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.authService.csrf(request, reply);
  }

  @Post("logout")
  async logout(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.authService.logout(request, reply);
  }
}
