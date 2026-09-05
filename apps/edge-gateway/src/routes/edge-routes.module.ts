import { Module } from "@nestjs/common";
import { CompatRoutesService } from "./compat/compat-routes.service.js";

@Module({
  providers: [CompatRoutesService],
  exports: [CompatRoutesService],
})
export class EdgeRoutesModule {}
