import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VoicesController } from "./voices.controller.js";
import { VoicesService } from "./voices.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VoicesController],
  providers: [VoicesService],
})
export class VoicesModule {}
