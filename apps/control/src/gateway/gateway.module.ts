import { Module } from "@nestjs/common";
import { GatewayController } from "./gateway.controller.js";
import { GatewayService } from "./gateway.service.js";
import { CommonModule } from "../common/common.module.js";

@Module({
  imports: [CommonModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
