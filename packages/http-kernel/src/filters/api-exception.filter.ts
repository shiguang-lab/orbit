import {
  ArgumentsHost,
  Catch,
  HttpException,
  Injectable,
  type ExceptionFilter,
} from "@nestjs/common";

/** Normalizes uncaught Nest exceptions to the gateway API error envelope. */
@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
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

    response.status(status).send({
      error: {
        type: status >= 500 ? "server_error" : status === 404 ? "not_found" : "invalid_request",
        message,
      },
      ...(request.id ? { requestId: request.id } : {}),
    });
  }
}
