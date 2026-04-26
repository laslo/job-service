import { ApiProperty } from "@nestjs/swagger";

import { jobStatusValues, type JobStatus } from "@job-service/db";

/**
 * Public-facing representation of a job row. Database `Date` columns are
 * serialized as ISO-8601 strings so the OpenAPI contract is JSON-native.
 */
export class JobDto {
  @ApiProperty({ format: "uuid", example: "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b" })
  id!: string;

  @ApiProperty({ example: "pdf.render", maxLength: 100 })
  type!: string;

  @ApiProperty({ enum: [...jobStatusValues], example: "pending" })
  status!: JobStatus;

  @ApiProperty({
    description: "Worker payload; arbitrary JSON object.",
    type: "object",
    additionalProperties: true,
  })
  payload!: Record<string, unknown>;

  @ApiProperty({ format: "date-time", example: "2026-04-26T20:31:11.000Z" })
  createdAt!: string;

  @ApiProperty({ format: "date-time", example: "2026-04-26T20:31:11.000Z" })
  updatedAt!: string;
}
