import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { CreateJobDto } from "./dto/create-job.dto.js";
import { ApiErrorDto } from "./dto/error.dto.js";
import { JobDto } from "./dto/job.dto.js";
import { JobsService } from "./jobs.service.js";

@ApiTags("jobs")
@Controller("jobs")
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
  create(@Body() body: CreateJobDto): Promise<JobDto> {
    return this.service.create(body);
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
  findById(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<JobDto> {
    return this.service.findById(id);
  }
}
