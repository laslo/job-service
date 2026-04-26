import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Public error envelope. Documented in `docs/reference/errors.md` and asserted
 * on by both unit tests and (later) Orval-generated clients.
 */
export class ApiErrorDto {
  @ApiProperty({ example: 400, description: "HTTP status code (mirrors the response status)." })
  statusCode!: number;

  @ApiProperty({
    example: "validation_error",
    description: "Stable, machine-readable error code; safe for clients to switch on.",
  })
  error!: string;

  @ApiProperty({
    example: "Request validation failed",
    description: "Human-readable summary; not localized.",
  })
  message!: string;

  @ApiPropertyOptional({
    description: "Optional structured details (validation issues, conflict info, etc.).",
    example: [{ path: "type", constraint: "isString", message: "type must be a string" }],
  })
  details?: unknown;
}
