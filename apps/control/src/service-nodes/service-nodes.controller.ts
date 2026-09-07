import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Patch,
} from "@nestjs/common";
import { ServiceNodesService } from "./service-nodes.service.js";

// Session/machine management authorization and CSRF are enforced by ControlSecurityService.
@Controller("api/service-nodes")
export class ServiceNodesController {
  constructor(
    @Inject(ServiceNodesService) private readonly service: ServiceNodesService,
  ) {}
  @Get() list() {
    return this.service.list();
  }
  @Post() create(@Body() body: unknown) {
    return this.service.create(body);
  }
  @Delete(":id") remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
  @Post(":id/refresh") refresh(@Param("id") id: string) {
    return this.service.refresh(id);
  }
  @Post(":id/instances") createInstance(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.request(id, "instances", "POST", body);
  }
  @Patch(":id/instances/:instanceId") async updateSettings(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
    @Body() body: unknown,
  ) {
    const result = await this.service.request(
      id,
      `instances/${encodeURIComponent(instanceId)}`,
      "PATCH",
      body,
    );
    await this.service.refresh(id);
    return result;
  }
  @Delete(":id/instances/:instanceId") deleteInstance(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.service.request(
      id,
      `instances/${encodeURIComponent(instanceId)}`,
      "DELETE",
    );
  }
  @Post(":id/instances/:instanceId/actions") action(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
    @Body() body: unknown,
  ) {
    return this.service.request(
      id,
      `instances/${encodeURIComponent(instanceId)}/actions`,
      "POST",
      body,
    );
  }
  @Get(":id/instances/:instanceId/logs") logs(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.service.request(
      id,
      `instances/${encodeURIComponent(instanceId)}/logs`,
    );
  }
  @Get(":id/instances/:instanceId/accounts") accounts(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
  ) {
    return this.service.request(
      id,
      `instances/${encodeURIComponent(instanceId)}/management/auth-files`,
    );
  }
  @Post(":id/instances/:instanceId/management") management(
    @Param("id") id: string,
    @Param("instanceId") instanceId: string,
    @Body() body: unknown,
  ) {
    return this.service.management(id, instanceId, body);
  }
  @Get(":id/jobs/:jobId") job(
    @Param("id") id: string,
    @Param("jobId") jobId: string,
  ) {
    return this.service.request(id, `jobs/${encodeURIComponent(jobId)}`);
  }
}
