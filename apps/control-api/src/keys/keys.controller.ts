import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { KeysService } from "./keys.service.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

@Controller("api/keys")
export class KeysController {
  constructor(
    @Inject(KeysService) private readonly keysService: KeysService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher
  ) {}

  @Get()
  keys(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.keysService.handleGetKeys(req));
  }

  @Post()
  createKey(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.keysService.handleCreateKey(req));
  }

  @Get("groups")
  groups(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.keysService.handleGetKeyGroups());
  }

  @Post("groups")
  createGroup(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.keysService.handleCreateKeyGroup(req));
  }

  @Get("groups/:id")
  group(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyGroupById(req, id),
      { id }
    );
  }

  @Put("groups/:id")
  updateGroup(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleUpdateKeyGroupById(req, id),
      { id }
    );
  }

  @Delete("groups/:id")
  deleteGroup(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleDeleteKeyGroupById(req, id),
      { id }
    );
  }

  @Get("groups/:id/keys")
  groupKeys(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyGroupKeys(req, id),
      { id }
    );
  }

  @Post("groups/:id/keys")
  addGroupKey(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleAddKeyToGroup(req, id),
      { id }
    );
  }

  @Delete("groups/:id/keys")
  removeGroupKey(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleRemoveKeyFromGroup(req, id),
      { id }
    );
  }

  @Get("groups/:id/permissions")
  groupPermissions(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyGroupPermissions(req, id),
      { id }
    );
  }

  @Post("groups/:id/permissions")
  addGroupPermission(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleAddKeyGroupPermission(req, id),
      { id }
    );
  }

  @Delete("groups/:id/permissions")
  removeGroupPermission(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleRemoveKeyGroupPermission(req, id),
      { id }
    );
  }

  @Get(":id/devices")
  devices(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyDevices(req, id),
      { id }
    );
  }

  @Post(":id/regenerate")
  regenerate(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleRegenerateKey(req, id),
      { id }
    );
  }

  @Get(":id/reveal")
  reveal(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleRevealKey(req, id),
      { id }
    );
  }

  @Get(":id/usage-limits")
  usageLimits(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyUsageLimits(req, id),
      { id }
    );
  }

  @Get(":id")
  key(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleGetKeyById(req, id),
      { id }
    );
  }

  @Patch(":id")
  patchKey(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handlePatchKeyById(req, id),
      { id }
    );
  }

  @Delete(":id")
  deleteKey(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.keysService.handleDeleteKeyById(req, id),
      { id }
    );
  }
}
