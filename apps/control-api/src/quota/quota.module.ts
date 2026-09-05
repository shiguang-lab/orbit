import { Module } from "@nestjs/common";
import { QuotaController } from "./quota.controller.js";
import { QuotaService } from "./quota.service.js";

@Module({
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
