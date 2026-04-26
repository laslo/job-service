import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ApiErrorCode } from "../common/api-error.js";
import { JobServiceDbClient } from "../db/db.client.js";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly db: JobServiceDbClient) {}

  @Get("healthz")
  @ApiOperation({ operationId: "liveness", summary: "Liveness probe" })
  @ApiResponse({ status: 200 })
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readyz")
  @ApiOperation({
    operationId: "readiness",
    summary: "Readiness probe",
    description: "Returns 200 once the database accepts queries; 503 otherwise.",
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 503 })
  async readiness(): Promise<{ status: "ready"; db: "ok" }> {
    try {
      await this.db.client.sql`SELECT 1`;
      return { status: "ready", db: "ok" };
    } catch (cause) {
      throw new ServiceUnavailableException({
        error: ApiErrorCode.ServiceUnavailable,
        message: "Database not reachable",
        details: { cause: cause instanceof Error ? cause.message : String(cause) },
      });
    }
  }
}
