import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { EvalsService } from "./evals.service.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  evalRunSuiteSchema,
  evalSuiteSaveSchema,
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/evals/validation";

const load = (specifier: string): Promise<any> => import(specifier as string);
const { sanitizeErrorMessage } = await load("@shiguang-gateway/open-sse/utils/error");

@Controller("api/evals")
export class EvalsController {
  constructor(@Inject(EvalsService) private readonly evalsService: EvalsService) {}

  @Get()
  async getEvals(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const result = await this.evalsService.getEvalsOverview();
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Post()
  async postEvals(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const validation = validateBody(evalRunSuiteSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const result = await this.evalsService.runSuite(validation.data);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Post("suites")
  async postSuites(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const validation = validateBody(evalSuiteSaveSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const suite = this.evalsService.createSuite(validation.data);
      return reply.status(201).send({ suite });
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || "Failed to create eval suite" });
    }
  }

  @Get("suites/:suiteId")
  async getSuiteById(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("suiteId") suiteId: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const suite = this.evalsService.getCustomSuite(suiteId);
      if (!suite) {
        return reply.status(404).send({ error: "Eval suite not found" });
      }
      return reply.send({ suite });
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || "Failed to load eval suite" });
    }
  }

  @Put("suites/:suiteId")
  async putSuiteById(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("suiteId") suiteId: string,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    const validation = validateBody(evalSuiteSaveSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const existing = this.evalsService.getCustomSuite(suiteId);
      if (!existing) {
        return reply.status(404).send({ error: "Eval suite not found" });
      }

      const suite = this.evalsService.updateCustomSuite(suiteId, validation.data);
      return reply.send({ suite });
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || "Failed to update eval suite" });
    }
  }

  @Delete("suites/:suiteId")
  async deleteSuiteById(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("suiteId") suiteId: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const deleted = this.evalsService.deleteCustomSuite(suiteId);
      if (!deleted) {
        return reply.status(404).send({ error: "Eval suite not found" });
      }
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ error: error?.message || "Failed to delete eval suite" });
    }
  }

  @Get(":suiteId")
  async getEvalById(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("suiteId") suiteId: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const suite = this.evalsService.getSuiteById(suiteId);
      if (!suite) {
        return reply.status(404).send({ error: `Suite not found: ${suiteId}` });
      }
      return reply.send(suite);
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }
}
