import { Injectable, NotFoundException } from "@nestjs/common";

import type { JobRow } from "@job-service/db";

import { ApiErrorCode } from "../common/api-error.js";
import { JobEventsPublisher } from "../kafka/job-events.publisher.js";
import type { CreateJobDto } from "./dto/create-job.dto.js";
import type { JobDto } from "./dto/job.dto.js";
import { JobsRepository } from "./jobs.repository.js";

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobsRepository,
    private readonly events: JobEventsPublisher,
  ) {}

  async create(input: CreateJobDto): Promise<JobDto> {
    const row = await this.repository.create({
      type: input.type,
      payload: input.payload ?? {},
    });
    const dto = toDto(row);
    // Publish-after-commit: the row is durable; if the broker is reachable
    // the consumer sees the event, otherwise the request fails loudly so
    // the operator notices. Outbox semantics are tracked for a later stage.
    await this.events.publishJobCreated(dto);
    return dto;
  }

  async findById(id: string): Promise<JobDto> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException({
        error: ApiErrorCode.JobNotFound,
        message: `Job ${id} not found`,
      });
    }
    return toDto(row);
  }
}

export function toDto(row: JobRow): JobDto {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
