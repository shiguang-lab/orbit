import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ChaosController } from "./chaos.controller.js";
import { ChaosService } from "./chaos.service.js";
import { ChaosCollectController } from "./chaos-collect.controller.js";

@Module({
  imports: [CommonModule],
  controllers: [ChaosController, ChaosCollectController],
  providers: [ChaosService],
})
export class ChaosModule {}
