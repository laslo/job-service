import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { ApiErrorCode } from "./api-error.js";

export interface ValidationDetail {
  readonly path: string;
  readonly constraint: string;
  readonly message: string;
}

/**
 * Global validation pipe. Strips unknown properties, rejects requests that
 * carry them, and reshapes class-validator errors into the documented public
 * envelope so curl, Swagger UI, and Orval-generated clients all see the same
 * payload.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        error: ApiErrorCode.ValidationError,
        message: "Request validation failed",
        details: flattenValidationErrors(errors),
      }),
  });
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath: readonly string[] = [],
): ValidationDetail[] {
  const out: ValidationDetail[] = [];
  for (const error of errors) {
    const path = [...parentPath, error.property];
    if (error.constraints) {
      for (const [constraint, message] of Object.entries(error.constraints)) {
        out.push({ path: path.join("."), constraint, message });
      }
    }
    if (error.children && error.children.length > 0) {
      out.push(...flattenValidationErrors(error.children, path));
    }
  }
  return out;
}
