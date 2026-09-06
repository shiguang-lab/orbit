import { Module } from "@nestjs/common";
import { ObsidianSettingsController } from "./obsidian.controller.js";
import { ObsidianWebdavController } from "./obsidian-webdav.controller.js";
import { ObsidianSettingsService } from "./obsidian.service.js";

@Module({ controllers: [ObsidianSettingsController, ObsidianWebdavController], providers: [ObsidianSettingsService] })
export class ObsidianSettingsModule {}
