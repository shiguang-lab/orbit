import { Module } from "@nestjs/common";
import { SystemController } from "./system.controller.js";
import { SystemService } from "./system.service.js";
import { CommonModule } from "../common/common.module.js";

@Module({
  imports: [CommonModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
