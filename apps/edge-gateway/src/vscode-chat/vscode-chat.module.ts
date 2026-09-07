import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeChatController } from "./vscode-chat.controller.js";
import { VscodeChatService } from "./vscode-chat.service.js";

@Module({ imports: [CommonModule], controllers: [VscodeChatController], providers: [VscodeChatService] })
export class VscodeChatModule {}
