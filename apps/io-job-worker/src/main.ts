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

import { readIoWorkerEnv } from "./env.js";
import { handleJobCreated, type HandlerLogger } from "./handler.js";
import { JobNotFoundError, WorkerJobsRepository } from "./jobs.repository.js";

const SUBSCRIBED_TOPICS = [Topics.JobsIo] as const;

const logger: HandlerLogger = {
  info: (m) => process.stdout.write(`${m}\n`),
  warn: (m) => process.stderr.write(`${m}\n`),
  error: (m) => process.stderr.write(`${m}\n`),
};

async function main(): Promise<void> {
  const kafkaEnv = readKafkaEnv();
  if (!kafkaEnv.enabled) {
    process.stdout.write("io-job-worker: Kafka is disabled (KAFKA_ENABLED=false); exiting cleanly.\n");
    return;
  }

  const ioEnv = readIoWorkerEnv();
  const dbClient = createClient({ max: 4 });
  const repository = new WorkerJobsRepository(dbClient.db);

  const consumer = createConsumer({
    env: { ...kafkaEnv, clientId: `io-job-worker@${hostname()}` },
    groupId: ConsumerGroups.IoJobWorker,
    config: { maxWaitTimeInMs: 1_000 },
  });

  installShutdownHandlers(consumer, dbClient.close);

  await consumer.connect();
  for (const topic of SUBSCRIBED_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  process.stdout.write(
    `io-job-worker: subscribed to [${SUBSCRIBED_TOPICS.join(", ")}] as group=${ConsumerGroups.IoJobWorker} ` +
      `(smtp=${ioEnv.smtpHost}:${ioEnv.smtpPort})\n`,
  );

  await consumer.run({
    autoCommit: true,
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
            `io-job-worker: skipping malformed message ` +
              `(topic=${topic} partition=${partition} offset=${offset}): ${err.message}\n`,
          );
          return;
        }
        throw err;
      }

      try {
        await handleJobCreated(event, { env: ioEnv, repository, logger });
      } catch (err) {
        if (err instanceof JobNotFoundError) {
          process.stderr.write(
            `io-job-worker: jobId=${event.id} not found in DB; will redeliver ` +
              `(topic=${topic} partition=${partition} offset=${offset})\n`,
          );
        }
        throw err;
      }

      process.stdout.write(
        `io-job-worker: committed topic=${topic} partition=${partition} offset=${offset} key=${key}\n`,
      );
    },
  });
}

function installShutdownHandlers(consumer: Consumer, closeDb: () => Promise<void>): void {
  let stopping = false;
  const stop = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`io-job-worker: ${signal} received, disconnecting…\n`);
    try {
      await consumer.disconnect();
    } catch (err) {
      process.stderr.write(`io-job-worker: error during consumer disconnect: ${formatError(err)}\n`);
    }
    try {
      await closeDb();
    } catch (err) {
      process.stderr.write(`io-job-worker: error during db close: ${formatError(err)}\n`);
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((err: unknown) => {
  process.stderr.write(`io-job-worker failed: ${formatError(err)}\n`);
  process.exit(1);
});

function formatError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

