import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { OAuthController } from "./oauth.controller.js";
import { OAuthService } from "./oauth.service.js";

@Module({
  imports: [CommonModule],
  controllers: [OAuthController],
  providers: [OAuthService],
})
export class OAuthModule {}
