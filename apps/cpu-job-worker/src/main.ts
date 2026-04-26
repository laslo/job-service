/**
 * Stage-5 CPU worker process.
 *
 * Wires together the kafkajs consumer (`@job-service/kafka`), the Drizzle
 * client (`@job-service/db`), and the per-message handler. Lives in its own
 * process so that:
 *
 *  - Workers can scale and fail independently of the HTTP API.
 *  - Resource ceilings (event-loop time, DB pool size) are scoped to compute
 *    and do not contend with HTTP latency budgets.
 *  - A future stage can replace the stub processor with a real worker class
 *    without touching the API code path.
 *
 * Offset commit semantics mirror the events-logger app: kafkajs commits the
 * offset only after `eachMessage` resolves, so a crash mid-handler causes
 * the message to be redelivered. Combined with the idempotent transitions
 * in `WorkerJobsRepository` this gives us at-least-once with safe replay.
 */

import { hostname } from "node:os";

import { createClient } from "@job-service/db";
import {
  ConsumerGroups,
  createConsumer,
  decodeJobCreated,
  JobCreatedDecodeError,
  readKafkaEnv,
  Topics,
  type Consumer,
} from "@job-service/kafka";

import { readCpuWorkerEnv } from "./env.js";
import { handleJobCreated, type HandlerLogger } from "./handler.js";
import { JobNotFoundError, WorkerJobsRepository } from "./jobs.repository.js";

const SUBSCRIBED_TOPICS = [Topics.JobsCreated] as const;

const logger: HandlerLogger = {
  info: (m) => process.stdout.write(`${m}\n`),
  warn: (m) => process.stderr.write(`${m}\n`),
  error: (m) => process.stderr.write(`${m}\n`),
};

async function main(): Promise<void> {
  const kafkaEnv = readKafkaEnv();
  if (!kafkaEnv.enabled) {
    process.stdout.write(
      "cpu-job-worker: Kafka is disabled (KAFKA_ENABLED=false); exiting cleanly.\n",
    );
    return;
  }

  const cpuEnv = readCpuWorkerEnv();
  const dbClient = createClient({ max: 4 });
  const repository = new WorkerJobsRepository(dbClient.db);

  const consumer = createConsumer({
    env: { ...kafkaEnv, clientId: `cpu-job-worker@${hostname()}` },
    groupId: ConsumerGroups.CpuJobWorker,
    config: {
      // Generous to accommodate the per-job CPU budget. kafkajs's default
      // (5 minutes) is fine for our 30s default timeout but we make it
      // explicit so the relationship is visible at the call site.
      maxWaitTimeInMs: 1_000,
    },
  });

  installShutdownHandlers(consumer, dbClient.close);

  await consumer.connect();
  for (const topic of SUBSCRIBED_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  process.stdout.write(
    `cpu-job-worker: subscribed to [${SUBSCRIBED_TOPICS.join(", ")}] as group=${ConsumerGroups.CpuJobWorker} ` +
      `(timeoutMs=${cpuEnv.timeoutMs}, defaultIterations=${cpuEnv.defaultIterations})\n`,
  );

  await consumer.run({
    autoCommit: true,
    // Process partitions sequentially so two CPU-bound jobs cannot saturate
    // the event loop in parallel and starve liveness checks. Stage 9 will
    // revisit this for the batch worker, where partition-level parallelism
    // matters more than tail latency.
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ topic, partition, message }) => {
      const offset = message.offset;
      const key = message.key?.toString("utf8") ?? "<null>";

      let event;
      try {
        event = decodeJobCreated(message.value);
      } catch (err) {
        if (err instanceof JobCreatedDecodeError) {
          process.stderr.write(
            `cpu-job-worker: skipping malformed message ` +
              `(topic=${topic} partition=${partition} offset=${offset}): ${err.message}\n`,
          );
          return;
        }
        throw err;
      }

      try {
        await handleJobCreated(event, { env: cpuEnv, repository, logger });
      } catch (err) {
        if (err instanceof JobNotFoundError) {
          // Row not visible yet (or deleted). Surface a warning and rethrow so
          // the offset is not committed; the message will be redelivered.
          process.stderr.write(
            `cpu-job-worker: jobId=${event.id} not found in DB; will redeliver ` +
              `(topic=${topic} partition=${partition} offset=${offset})\n`,
          );
        }
        throw err;
      }

      process.stdout.write(
        `cpu-job-worker: committed topic=${topic} partition=${partition} offset=${offset} key=${key}\n`,
      );
    },
  });
}

function installShutdownHandlers(consumer: Consumer, closeDb: () => Promise<void>): void {
  let stopping = false;
  const stop = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`cpu-job-worker: ${signal} received, disconnecting…\n`);
    try {
      await consumer.disconnect();
    } catch (err) {
      process.stderr.write(
        `cpu-job-worker: error during consumer disconnect: ${formatError(err)}\n`,
      );
    }
    try {
      await closeDb();
    } catch (err) {
      process.stderr.write(`cpu-job-worker: error during db close: ${formatError(err)}\n`);
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((err: unknown) => {
  process.stderr.write(`cpu-job-worker failed: ${formatError(err)}\n`);
  process.exit(1);
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
