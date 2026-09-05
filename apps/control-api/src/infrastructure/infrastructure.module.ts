import { Module } from "@nestjs/common";
import { CompatRoutesService } from "./compat-routes.service.js";
import { ControlRuntimeService } from "./control-runtime.service.js";
import { ControlSecurityService } from "./control-security.service.js";

@Module({
  providers: [ControlRuntimeService, ControlSecurityService, CompatRoutesService],
})
export class InfrastructureModule {}
