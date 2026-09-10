import {
  ArgumentsHost,
  Catch,
  HttpException,
  Injectable,
  type ExceptionFilter,
} from "@nestjs/common";
import { sanitizeErrorMessage, sanitizeUpstreamDetails } from "@orbit/utils/errors";

/** Normalizes uncaught Nest exceptions to the gateway API error envelope. */
@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status?: (code: number) => { send: (body: unknown) => void };
      code?: (code: number) => { send: (body: unknown) => void };
      statusCode?: number;
      end?: (body: string) => void;
      setHeader?: (name: string, value: string) => void;
    }>();
    const request = host.switchToHttp().getRequest<{ id?: string }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof payload === "string"
      ? payload
      : typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : exception instanceof Error
          ? exception.message
          : "Internal Server Error";

    const body = {
      error: {
        type: status >= 500 ? "server_error" : status === 404 ? "not_found" : "invalid_request",
        message: sanitizeErrorMessage(message),
        ...(payload && typeof payload === "object" && "details" in payload
          ? { details: sanitizeUpstreamDetails((payload as { details?: unknown }).details) }
          : {}),
      },
      ...(request.id ? { requestId: request.id } : {}),
    };
    if (typeof response.status === "function") {
      response.status(status).send(body);
      return;
    }
    if (typeof response.code === "function") {
      response.code(status).send(body);
      return;
    }
    response.statusCode = status;
    response.setHeader?.("content-type", "application/json; charset=utf-8");
    response.end?.(JSON.stringify(body));
  }
}
