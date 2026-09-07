import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { acceptServiceNodeReport } from "@orbit/core/control/service-nodes";
import { nodeReportSchema } from "./report-schema.js";

// Internal network endpoint. Console management routes retain session authorization.
@Controller("internal/service-nodes")
export class NodeReportsController {
  @Post(":id/report")
  @HttpCode(204)
  report(@Param("id") id: string, @Body() body: unknown) {
    const parsed = nodeReportSchema.safeParse(body);
    if (!parsed.success || parsed.data.nodeId !== id)
      throw new BadRequestException("Invalid node report");
    if (!acceptServiceNodeReport(id, parsed.data))
      throw new NotFoundException("Instance not found");
  }
}
