import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { TagsController } from "./tags.controller.js";
import { TagsService } from "./tags.service.js";

@Module({
  imports: [CommonModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
