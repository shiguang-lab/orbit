import { Global, Module } from "@nestjs/common";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

@Global()
@Module({
  providers: [WebRouteDispatcher],
  exports: [WebRouteDispatcher],
})
export class HttpInfrastructureModule {}
