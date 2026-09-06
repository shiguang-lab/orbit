import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProxyFallbackController } from "./proxy-fallback.controller.js";
import { ProxyFallbackService } from "./proxy-fallback.service.js";

@Module({ imports: [CommonModule], controllers: [ProxyFallbackController], providers: [ProxyFallbackService] })
export class ProxyFallbackModule {}
