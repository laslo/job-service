import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

/**
 * Request body for `POST /v1/jobs`. The runtime contract enforced by
 * class-validator is also the source of truth for the OpenAPI schema (per
 * ADR-0004), so changes here propagate to generated clients automatically.
 */
export class CreateJobDto {
  @ApiProperty({
    description:
      "Job type identifier; routes the job to the matching worker class in later stages.",
    example: "pdf.render",
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9._-]*$/i, {
    message:
      "type must start with a letter and contain only letters, digits, dots, underscores or hyphens",
  })
  readonly type!: string;

  @ApiPropertyOptional({
    description: "Arbitrary JSON object passed to the worker.",
    type: "object",
    additionalProperties: true,
    example: { templateId: "invoice-v3", invoiceId: "8f00b0d4-1f6f-4a56-9b51-2b6cba1bb2e7" },
  })
  @IsOptional()
  @IsObject()
  readonly payload?: Record<string, unknown>;
}
