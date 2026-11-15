import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolveRequestId } from './request-id';
import { toApiError } from './to-api-error';

/** Every HTTP error leaves the server as an ApiError JSON body. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { status, body } = toApiError(exception, req.requestId ?? resolveRequestId(undefined));
    res.status(status).json(body);
  }
}
