import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { PlaygroundController } from "./playground.controller.js";
import { PlaygroundService } from "./playground.service.js";

@Module({ imports: [CommonModule], controllers: [PlaygroundController], providers: [PlaygroundService] })
export class PlaygroundModule {}
