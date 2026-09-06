import { Module } from "@nestjs/common";
import { NotionSettingsController } from "./notion.controller.js";
import { NotionSettingsService } from "./notion.service.js";

@Module({ controllers: [NotionSettingsController], providers: [NotionSettingsService] })
export class NotionSettingsModule {}
