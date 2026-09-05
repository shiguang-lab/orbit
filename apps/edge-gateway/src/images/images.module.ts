import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ImagesController } from "./images.controller.js";
import { ImagesService } from "./images.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
