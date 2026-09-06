import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { DocsController } from "./docs.controller.js";

@Module({ imports: [CommonModule], controllers: [DocsController] })
export class DocsModule {}
