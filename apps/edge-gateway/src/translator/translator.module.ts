import { Module } from "@nestjs/common";
import { TranslatorController } from "./translator.controller.js";
import { TranslatorService } from "./translator.service.js";

@Module({ controllers: [TranslatorController], providers: [TranslatorService] })
export class TranslatorModule {}
