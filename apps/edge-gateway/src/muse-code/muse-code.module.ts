import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MuseCodeController } from "./muse-code.controller.js";
import { MuseCodeService } from "./muse-code.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MuseCodeController],
  providers: [MuseCodeService],
})
export class MuseCodeModule {}
