import { Module } from "@nestjs/common";
import { GuardrailsController } from "./guardrails.controller.js";
import { GuardrailsService } from "./guardrails.service.js";

@Module({
  controllers: [GuardrailsController],
  providers: [GuardrailsService],
})
export class GuardrailsModule {}
