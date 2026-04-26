import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { type ApiErrorBody, defaultErrorCode } from "./api-error.js";

/**
 * Single source of truth for HTTP error shapes. Every error reaching the
 * client — validation failures, NotFound from services, unhandled exceptions —
 * is normalized to {@link ApiErrorBody}. Tests assert on this shape directly.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }
}

export function toErrorBody(exception: unknown): ApiErrorBody {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === "string") {
      return {
        statusCode: status,
        error: defaultErrorCode(status),
        message: payload,
      };
    }

    if (typeof payload === "object" && payload !== null) {
      const candidate = payload as Record<string, unknown>;
      const error = isStableErrorCode(candidate.error) ? candidate.error : defaultErrorCode(status);
      const message = pickMessage(candidate, exception.message);
      const details = candidate.details;
      return {
        statusCode: status,
        error,
        message,
        ...(details !== undefined ? { details } : {}),
      };
    }

    return {
      statusCode: status,
      error: defaultErrorCode(status),
      message: exception.message,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: defaultErrorCode(HttpStatus.INTERNAL_SERVER_ERROR),
    message: "Internal server error",
  };
}

function pickMessage(candidate: Record<string, unknown>, fallback: string): string {
  const raw = candidate.message;
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && raw.every((m) => typeof m === "string")) {
    return raw.join("; ");
  }
  return fallback;
}

/**
 * True only for snake_case identifiers we authored. NestJS auto-fills
 * `error: "Bad Request"` (the HTTP reason phrase) when no explicit code is
 * supplied — we deliberately ignore that and emit our own stable code instead.
 */
function isStableErrorCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_]*$/.test(value);
}
