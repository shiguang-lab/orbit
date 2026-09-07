import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { FreeProviderRankingsController } from "./free-tier.controller.js";
import { FreeTierSummaryController } from "./free-tier-summary.controller.js";
import { FreeTierService } from "./free-tier.service.js";

@Module({
  imports: [CommonModule],
  controllers: [FreeProviderRankingsController, FreeTierSummaryController],
  providers: [FreeTierService],
})
export class FreeTierModule {}
