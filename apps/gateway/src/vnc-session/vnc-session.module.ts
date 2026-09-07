import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VncSessionController } from "./vnc-session.controller.js";
import { VncSessionService } from "./vnc-session.service.js";

@Module({ imports: [CommonModule], controllers: [VncSessionController], providers: [VncSessionService] })
export class VncSessionModule {}
