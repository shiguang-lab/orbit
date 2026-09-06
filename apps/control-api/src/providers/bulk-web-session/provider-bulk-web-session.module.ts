import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { ProviderBulkWebSessionController } from "./provider-bulk-web-session.controller.js";
import { ProviderBulkWebSessionService } from "./provider-bulk-web-session.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderBulkWebSessionController],
  providers: [ProviderBulkWebSessionService],
})
export class ProviderBulkWebSessionModule {}
