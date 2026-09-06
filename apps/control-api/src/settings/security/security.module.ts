import { Module } from "@nestjs/common";
import { SettingsSecurityController } from "./security.controller.js";
import { SettingsSecurityService } from "./security.service.js";

/** Security and policy settings owned by the control plane. */
@Module({
  controllers: [SettingsSecurityController],
  providers: [SettingsSecurityService],
})
export class SettingsSecurityModule {}
