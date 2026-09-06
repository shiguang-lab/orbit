import { Module } from "@nestjs/common";
import { TierConfigController } from "./tier-config.controller.js";
import { TierConfigService } from "./tier-config.service.js";

/** Control-plane provider routing-tier configuration endpoints. */
@Module({
  controllers: [TierConfigController],
  providers: [TierConfigService],
})
export class TierConfigModule {}
