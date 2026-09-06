import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { IntelligenceController } from "./intelligence.controller.js";

@Module({ imports: [CommonModule], controllers: [IntelligenceController] })
export class IntelligenceModule {}
