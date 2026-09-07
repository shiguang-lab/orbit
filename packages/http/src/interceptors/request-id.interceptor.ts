import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

/** Ensures every Nest response carries the request correlation id. */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{ header?: (name: string, value: string) => void }>();
    const request = context.switchToHttp().getRequest<{ id?: string }>();
    if (request.id && typeof response.header === "function") {
      response.header("x-request-id", request.id);
    }
    return next.handle();
  }
}
