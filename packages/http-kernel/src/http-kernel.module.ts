import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { HealthModule } from "./health/health.module.js";
import { ApiExceptionFilter } from "./filters/api-exception.filter.js";
import { RequestIdInterceptor } from "./interceptors/request-id.interceptor.js";
import { RequestIdMiddleware } from "./middleware/request-id.middleware.js";

/**
 * Nest transport module shared by the HTTP applications.
 *
 * Apps opt in by importing this module from their own AppModule. It owns only
 * transport concerns; authentication and domain routes remain app-owned.
 */
@Module({
  imports: [HealthModule],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class HttpKernelModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
