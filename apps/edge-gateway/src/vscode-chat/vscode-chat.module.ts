import { Module } from "@nestjs/common";
import { VscodeChatController } from "./vscode-chat.controller.js";
import { VscodeChatService } from "./vscode-chat.service.js";

@Module({ controllers: [VscodeChatController], providers: [VscodeChatService] })
export class VscodeChatModule {}
