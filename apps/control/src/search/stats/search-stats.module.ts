import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { SearchStatsController } from "./search-stats.controller.js";
import { SearchStatsService } from "./search-stats.service.js";

@Module({
  imports: [CommonModule],
  controllers: [SearchStatsController],
  providers: [SearchStatsService],
})
export class SearchStatsModule {}
