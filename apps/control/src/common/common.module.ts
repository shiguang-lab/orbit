import { Module } from "@nestjs/common";
import { WebRouteDispatcher } from "./web-route.dispatcher.js";

/** Shared transport helpers used by control-plane feature modules. */
@Module({
  providers: [WebRouteDispatcher],
  exports: [WebRouteDispatcher],
})
export class CommonModule {}
