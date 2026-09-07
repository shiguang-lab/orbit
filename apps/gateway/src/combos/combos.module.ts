import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CombosController } from "./combos.controller.js";
import { CombosService } from "./combos.service.js";

@Module({
  imports: [CommonModule],
  controllers: [CombosController],
  providers: [CombosService],
})
export class CombosModule {}
