import { Module, type OnModuleInit } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { CommandCodeAuthController } from "./command-code-auth.controller.js";
import { CommandCodeAuthRepository } from "./command-code-auth.repository.js";
import { CommandCodeAuthService } from "./command-code-auth.service.js";
import { ensureCommandCodeAuthSchema } from "./command-code-auth.schema.js";

@Module({
  imports: [CommonModule],
  controllers: [CommandCodeAuthController],
  providers: [CommandCodeAuthRepository, CommandCodeAuthService],
})
export class CommandCodeAuthModule implements OnModuleInit {
  onModuleInit(): void {
    ensureCommandCodeAuthSchema();
  }
}
