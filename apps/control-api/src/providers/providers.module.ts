import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProvidersController } from "./providers.controller.js";
import { ProvidersService } from "./providers.service.js";
import { ProviderPolicyService } from "./provider-policy.service.js";
import { ProviderClientService } from "./provider-client.service.js";
import { ProviderOnboardingController } from "./provider-onboarding.controller.js";
import { ProviderOnboardingService } from "./provider-onboarding.service.js";
import { ZedImportModule } from "./zed/zed-import.module.js";
import { VolcenginePlanModule } from "./volcengine/volcengine-plan.module.js";
import { CommandCodeAuthModule } from "./command-code/command-code-auth.module.js";
import { SuggestedModelsModule } from "./suggested-models/suggested-models.module.js";

@Module({
  imports: [CommonModule, ZedImportModule, VolcenginePlanModule, CommandCodeAuthModule, SuggestedModelsModule],
  controllers: [ProvidersController, ProviderOnboardingController],
  providers: [ProvidersService, ProviderPolicyService, ProviderClientService, ProviderOnboardingService],
})
export class ProvidersModule {}
