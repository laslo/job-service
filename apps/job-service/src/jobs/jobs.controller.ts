import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PrincipalId } from "../auth/principal.decorator.js";
import { CreateJobDto } from "./dto/create-job.dto.js";
import { ApiErrorDto } from "./dto/error.dto.js";
import { JobDto } from "./dto/job.dto.js";
import { JobsService } from "./jobs.service.js";

@ApiTags("jobs")
@Controller("jobs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("jwt")
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: "createJob",
    summary: "Create a new job",
    description: "Inserts a job row in `pending` state and returns the persisted record.",
  })
  @ApiResponse({ status: 201, type: JobDto, description: "Job created" })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "Validation error" })
  create(@PrincipalId() principalId: string, @Body() body: CreateJobDto): Promise<JobDto> {
    return this.service.create(principalId, body);
  }

  @Get(":id")
  @ApiOperation({
    operationId: "getJobById",
    summary: "Fetch a job by id",
    description: "Returns the current persisted state, including status and payload.",
  })
  @ApiResponse({ status: 200, type: JobDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "`id` is not a valid UUID" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: "Job not found" })
  findById(
    @PrincipalId() principalId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<JobDto> {
    return this.service.findById(principalId, id);
  }
}
