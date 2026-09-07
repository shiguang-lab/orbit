import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { FallbackController } from "./fallback.controller.js";
import { FallbackService } from "./fallback.service.js";

@Module({ imports: [CommonModule], controllers: [FallbackController], providers: [FallbackService] })
export class FallbackModule {}
