import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { GeminiV1betaController } from "./gemini-v1beta.controller.js";
import { GeminiV1betaService } from "./gemini-v1beta.service.js";

@Module({ imports: [CommonModule], controllers: [GeminiV1betaController], providers: [GeminiV1betaService] })
export class GeminiV1betaModule {}
