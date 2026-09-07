import { Module } from "@nestjs/common";
import { RuntimeControlController } from "./runtime-control.controller.js";
import { RuntimeControlService } from "./runtime-control.service.js";
import { LocalProviderHealthService } from "./local-provider-health.service.js";

@Module({
  controllers: [RuntimeControlController],
  providers: [RuntimeControlService, LocalProviderHealthService],
})
export class RuntimeControlModule {}
