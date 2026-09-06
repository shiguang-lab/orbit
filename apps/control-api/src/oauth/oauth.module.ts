import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { OAuthController } from "./oauth.controller.js";
import { OAuthService } from "./oauth.service.js";
import { TraeAuthorizeController } from "./trae-authorize.controller.js";

@Module({
  imports: [CommonModule],
  controllers: [OAuthController, TraeAuthorizeController],
  providers: [OAuthService],
})
export class OAuthModule {}
