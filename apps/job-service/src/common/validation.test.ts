import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateJobDto } from "../jobs/dto/create-job.dto.js";
import { buildValidationPipe, flattenValidationErrors } from "./validation.js";

describe("CreateJobDto rules", () => {
  it("accepts a well-formed payload", () => {
    const dto = plainToInstance(CreateJobDto, { type: "pdf.render", payload: { a: 1 } });
    expect(validateSync(dto)).toEqual([]);
  });

  it("rejects a missing type", () => {
    const dto = plainToInstance(CreateJobDto, {});
    const errors = validateSync(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("type");
    expect(errors[0]?.constraints).toMatchObject({ isString: expect.any(String) });
  });

  it("rejects an empty type", () => {
    const dto = plainToInstance(CreateJobDto, { type: "" });
    const errors = validateSync(dto);
    expect(errors[0]?.constraints).toMatchObject({ minLength: expect.any(String) });
  });

  it("rejects an invalid type pattern", () => {
    const dto = plainToInstance(CreateJobDto, { type: "1bad" });
    const errors = validateSync(dto);
    expect(errors[0]?.constraints).toMatchObject({ matches: expect.any(String) });
  });

  it("rejects an over-long type", () => {
    const dto = plainToInstance(CreateJobDto, { type: "a".repeat(101) });
    const errors = validateSync(dto);
    expect(errors[0]?.constraints).toMatchObject({ maxLength: expect.any(String) });
  });

  it("rejects a non-object payload", () => {
    const dto = plainToInstance(CreateJobDto, { type: "pdf.render", payload: 42 });
    const errors = validateSync(dto);
    expect(errors[0]?.property).toBe("payload");
    expect(errors[0]?.constraints).toMatchObject({ isObject: expect.any(String) });
  });
});

describe("flattenValidationErrors", () => {
  it("flattens nested children into dotted paths", () => {
    const errors = [
      {
        property: "user",
        constraints: undefined,
        children: [
          {
            property: "name",
            constraints: { isString: "name must be a string" },
            children: [],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { path: "user.name", constraint: "isString", message: "name must be a string" },
    ]);
  });
});

describe("buildValidationPipe", () => {
  it("rejects unknown fields with the documented validation_error envelope", async () => {
    const pipe = buildValidationPipe();

    await expect(
      pipe.transform(
        { type: "pdf.render", rogue: true },
        { type: "body", metatype: CreateJobDto, data: "" },
      ),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: {
        error: "validation_error",
        message: "Request validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({ path: "rogue", constraint: "whitelistValidation" }),
        ]),
      },
    });
  });

  it("returns the transformed instance on success", async () => {
    const pipe = buildValidationPipe();
    const result = await pipe.transform(
      { type: "pdf.render" },
      { type: "body", metatype: CreateJobDto, data: "" },
    );
    expect(result).toBeInstanceOf(CreateJobDto);
    expect(result.type).toBe("pdf.render");
  });
});
