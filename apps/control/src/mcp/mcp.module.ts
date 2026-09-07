import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { McpController } from "./mcp.controller.js";
import { McpService } from "./mcp.service.js";

@Module({ imports: [CommonModule], controllers: [McpController], providers: [McpService] })
export class McpModule {}
