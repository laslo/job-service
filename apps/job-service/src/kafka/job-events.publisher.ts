import { Injectable, Logger } from "@nestjs/common";

import {
  encodeJobCreated,
  JOB_CREATED_SCHEMA_VERSION,
  type JobCreatedEvent,
} from "@job-service/kafka";

import type { JobDto } from "../jobs/dto/job.dto.js";
import { KafkaClient } from "./kafka.client.js";

/**
 * Publishes job-domain events to Kafka.
 *
 * Stage-4 scope: a single `jobs.created` topic. The producer call is
 * synchronous from the caller's perspective — if it throws, `JobsService`
 * surfaces a 500 to the client. This is loud-by-default; we will revisit
 * with a transactional outbox in a later stage so a broker outage cannot
 * lose events committed to Postgres.
 *
 * When `KAFKA_ENABLED=false` this becomes a no-op (logged once at debug
 * level), keeping the API usable during Stage-1 to Stage-3 dev loops.
 */
@Injectable()
export class JobEventsPublisher {
  private readonly logger = new Logger(JobEventsPublisher.name);

  constructor(private readonly kafka: KafkaClient) {}

  async publishJobCreated(job: JobDto): Promise<void> {
    if (!this.kafka.isEnabled()) {
      this.logger.debug?.(`Kafka disabled; skipped publish for job ${job.id}`);
      return;
    }
    if (job.status !== "pending") {
      // Defensive: the contract for jobs.created is "row was just inserted in
      // pending state". A non-pending DTO would indicate a misuse upstream.
      throw new Error(
        `JobEventsPublisher.publishJobCreated requires status='pending', got '${job.status}'`,
      );
    }

    const event: JobCreatedEvent = {
      schemaVersion: JOB_CREATED_SCHEMA_VERSION,
      id: job.id,
      type: job.type,
      status: "pending",
      createdAt: job.createdAt,
    };
    const encoded = encodeJobCreated(event);

    await this.kafka.getProducer().send({
      topic: encoded.topic,
      messages: [
        {
          key: encoded.key,
          value: encoded.value,
          headers: encoded.headers,
        },
      ],
    });
  }
}
