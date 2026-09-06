import { Body, Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
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

  private send(reply: FastifyReply, result: Awaited<ReturnType<AuthService["login"]>>) {
    for (const [name, value] of Object.entries(result.headers ?? {})) reply.header(name, value);
    if (result.cookies?.length) reply.header("set-cookie", result.cookies);
    if (result.location) return reply.redirect(result.location, result.status);
    return reply.status(result.status).send(result.body);
  }

  @Get("status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const token = readCookie(request, "auth_token");
    const authenticated = await this.authService.verifyAuthToken(token);
    return reply.send({ authenticated });
  }

  @Get("csrf")
  async csrf(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.send(reply, await this.authService.csrf(request));
  }

  @Post("login")
  async login(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown): Promise<unknown> {
    return this.send(reply, await this.authService.login(request, body));
  }

  @Post("logout")
  async logout(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.send(reply, await this.authService.logout(request));
  }

  @Get("oidc/login")
  async oidcLogin(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.send(reply, await this.authService.oidcLogin(request));
  }

  @Get("oidc/callback")
  async oidcCallback(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    return this.send(reply, await this.authService.oidcCallback(request));
  }
}
