/**
 * Stage-4 worker stub: subscribes to `jobs.created`, logs each message, and
 * lets kafkajs commit offsets only after the handler returns successfully.
 *
 * Why a separate process and not a worker inside the API?
 *  - Mirrors the Stage-5+ topology where workers scale and fail
 *    independently of the HTTP service.
 *  - Validates that a clean consumer group can attach without any HTTP code
 *    in the path.
 *
 * Offset-commit semantics:
 *  - `eachMessage` mode: kafkajs commits after the handler resolves, so a
 *    crash mid-handler causes redelivery rather than data loss.
 *  - We additionally call `consumer.commitOffsets(...)` after each message to
 *    make the "safe commit" boundary explicit and visible in broker logs.
 */

import { hostname } from "node:os";

import {
  ConsumerGroups,
  createConsumer,
  decodeJobCreated,
  JobCreatedDecodeError,
  readKafkaEnv,
  Topics,
} from "@job-service/kafka";

const SUBSCRIBED_TOPICS = [Topics.JobsCreated] as const;

async function main(): Promise<void> {
  const env = readKafkaEnv();
  if (!env.enabled) {
    process.stdout.write(
      "job-events-logger: Kafka is disabled (KAFKA_ENABLED=false); exiting cleanly.\n",
    );
    return;
  }

  const consumer = createConsumer({
    env: { ...env, clientId: `job-events-logger@${hostname()}` },
    groupId: ConsumerGroups.JobEventsLogger,
  });

  let stopping = false;
  const stop = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    process.stdout.write(`job-events-logger: ${signal} received, disconnecting…\n`);
    try {
      await consumer.disconnect();
    } catch (err) {
      process.stderr.write(`job-events-logger: error during disconnect: ${formatError(err)}\n`);
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));

  await consumer.connect();
  for (const topic of SUBSCRIBED_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  process.stdout.write(
    `job-events-logger: subscribed to [${SUBSCRIBED_TOPICS.join(", ")}] as group=${ConsumerGroups.JobEventsLogger}\n`,
  );

  await consumer.run({
    autoCommit: true,
    eachMessage: async ({ topic, partition, message }) => {
      const offset = message.offset;
      const key = message.key?.toString("utf8") ?? "<null>";

      try {
        const event = decodeJobCreated(message.value);
        process.stdout.write(
          [
            "job-events-logger:",
            `topic=${topic}`,
            `partition=${partition}`,
            `offset=${offset}`,
            `key=${key}`,
            `jobId=${event.id}`,
            `type=${event.type}`,
            `createdAt=${event.createdAt}`,
          ].join(" ") + "\n",
        );
      } catch (err) {
        if (err instanceof JobCreatedDecodeError) {
          process.stderr.write(
            `job-events-logger: skipping malformed message ` +
              `(topic=${topic} partition=${partition} offset=${offset}): ${err.message}\n`,
          );
        } else {
          throw err;
        }
      }

      // Make the commit boundary explicit. kafkajs would also commit on
      // successful eachMessage return; doing it here surfaces the offset
      // advance immediately and is convenient for the smoke test.
      await consumer.commitOffsets([
        { topic, partition, offset: (BigInt(offset) + 1n).toString() },
      ]);
    },
  });
}

main().catch((err: unknown) => {
  process.stderr.write(`job-events-logger failed: ${formatError(err)}\n`);
  process.exit(1);
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
