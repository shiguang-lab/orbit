import { Module } from "@nestjs/common";
import { ModelCapabilityOverridesController } from "./model-capability-overrides.controller.js";
import { ModelCapabilityOverridesService } from "./model-capability-overrides.service.js";

@Module({
  controllers: [ModelCapabilityOverridesController],
  providers: [ModelCapabilityOverridesService],
})
export class ModelCapabilityOverridesModule {}
