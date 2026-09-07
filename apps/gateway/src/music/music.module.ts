import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MusicController } from "./music.controller.js";
import { MusicService } from "./music.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MusicController],
  providers: [MusicService],
})
export class MusicModule {}
