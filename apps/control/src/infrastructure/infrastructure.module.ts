import { Module } from "@nestjs/common";
import { ControlRuntimeService } from "./control-runtime.service.js";
import { ControlSecurityService } from "./control-security.service.js";

@Module({
  providers: [ControlRuntimeService, ControlSecurityService],
})
export class InfrastructureModule {}
