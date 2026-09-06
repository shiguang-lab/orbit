import { Module } from "@nestjs/common";
import { ProviderAuthImportController } from "./provider-auth-import.controller.js";
import { ProviderAuthImportService } from "./provider-auth-import.service.js";
import { ProviderCredentialFilesController } from "./provider-credential-files.controller.js";
import { ProviderCredentialFilesService } from "./provider-credential-files.service.js";
import { CommonModule } from "../../common/common.module.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderAuthImportController, ProviderCredentialFilesController],
  providers: [ProviderAuthImportService, ProviderCredentialFilesService],
})
export class ProviderAuthImportModule {}
