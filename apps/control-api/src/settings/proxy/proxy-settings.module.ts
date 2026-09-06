import { Module } from "@nestjs/common";
import { ProxySettingsController } from "./proxy-settings.controller.js";
import { ProxySettingsService } from "./proxy-settings.service.js";

@Module({ controllers: [ProxySettingsController], providers: [ProxySettingsService] })
export class ProxySettingsModule {}
