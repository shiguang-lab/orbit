import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MeController } from "./me.controller.js";
import { MeService } from "./me.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
