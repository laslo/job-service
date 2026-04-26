import { BadRequestException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { ApiErrorCode } from "./api-error.js";
import { toErrorBody } from "./exception.filter.js";

describe("toErrorBody", () => {
  it("preserves the documented envelope from a structured BadRequestException", () => {
    const exception = new BadRequestException({
      error: ApiErrorCode.ValidationError,
      message: "Request validation failed",
      details: [{ path: "type", constraint: "isString", message: "type must be a string" }],
    });

    expect(toErrorBody(exception)).toEqual({
      statusCode: 400,
      error: "validation_error",
      message: "Request validation failed",
      details: [{ path: "type", constraint: "isString", message: "type must be a string" }],
    });
  });

  it("backfills a default error code when only a string payload is provided", () => {
    const exception = new BadRequestException("malformed input");

    expect(toErrorBody(exception)).toEqual({
      statusCode: 400,
      error: "bad_request",
      message: "malformed input",
    });
  });

  it("normalizes a NotFoundException with a custom error code", () => {
    const exception = new NotFoundException({
      error: ApiErrorCode.JobNotFound,
      message: "Job 1 not found",
    });

    expect(toErrorBody(exception)).toEqual({
      statusCode: 404,
      error: "job_not_found",
      message: "Job 1 not found",
    });
  });

  it("joins array messages produced by class-validator's default exception factory", () => {
    const exception = new HttpException(
      { message: ["type must be a string", "type should not be empty"] },
      HttpStatus.BAD_REQUEST,
    );

    expect(toErrorBody(exception)).toEqual({
      statusCode: 400,
      error: "bad_request",
      message: "type must be a string; type should not be empty",
    });
  });

  it("maps unknown exceptions to a 500 internal_error envelope", () => {
    expect(toErrorBody(new Error("boom"))).toEqual({
      statusCode: 500,
      error: "internal_error",
      message: "Internal server error",
    });

    expect(toErrorBody("non-error throw")).toEqual({
      statusCode: 500,
      error: "internal_error",
      message: "Internal server error",
    });
  });
});
