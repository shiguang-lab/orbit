import { Module } from "@nestjs/common";
import { HeadroomController } from "./headroom.controller.js";
import { HeadroomService } from "./headroom.service.js";

@Module({
  controllers: [HeadroomController],
  providers: [HeadroomService],
})
export class HeadroomModule {}
