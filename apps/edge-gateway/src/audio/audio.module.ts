import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AudioController } from "./audio.controller.js";
import { AudioService } from "./audio.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
