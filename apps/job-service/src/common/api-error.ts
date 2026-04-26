/**
 * Stable machine-readable error codes documented in `docs/reference/errors.md`.
 * Codes are part of the public HTTP contract; renaming one is a breaking change.
 */

export const ApiErrorCode = {
  ValidationError: "validation_error",
  BadRequest: "bad_request",
  Unauthorized: "unauthorized",
  Forbidden: "forbidden",
  NotFound: "not_found",
  JobNotFound: "job_not_found",
  Conflict: "conflict",
  UnsupportedMediaType: "unsupported_media_type",
  UnprocessableEntity: "unprocessable_entity",
  RateLimited: "rate_limited",
  ServiceUnavailable: "service_unavailable",
  InternalError: "internal_error",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  readonly statusCode: number;
  readonly error: ApiErrorCode | string;
  readonly message: string;
  readonly details?: unknown;
}

export function defaultErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.BadRequest;
    case 401:
      return ApiErrorCode.Unauthorized;
    case 403:
      return ApiErrorCode.Forbidden;
    case 404:
      return ApiErrorCode.NotFound;
    case 409:
      return ApiErrorCode.Conflict;
    case 415:
      return ApiErrorCode.UnsupportedMediaType;
    case 422:
      return ApiErrorCode.UnprocessableEntity;
    case 429:
      return ApiErrorCode.RateLimited;
    case 503:
      return ApiErrorCode.ServiceUnavailable;
    default:
      return status >= 500 ? ApiErrorCode.InternalError : ApiErrorCode.BadRequest;
  }
}
