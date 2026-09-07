import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { TranslatorController } from "./translator.controller.js";
import { TranslatorService } from "./translator.service.js";

@Module({ imports: [CommonModule], controllers: [TranslatorController], providers: [TranslatorService] })
export class TranslatorModule {}
