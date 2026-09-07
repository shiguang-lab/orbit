import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VideosController } from "./videos.controller.js";
import { VideosService } from "./videos.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}

