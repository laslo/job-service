#!/usr/bin/env -S tsx
/**
 * Converges the Kafka cluster to match the in-repo topic registry
 * (`packages/kafka/src/topics.ts`). Idempotent and safe to re-run.
 *
 * Behavior:
 *  - Skips topics that already exist (does not "patch" partitions or configs;
 *    that requires explicit operator intent and is out of Stage-4 scope).
 *  - Creates missing topics with the declared partitions, replication factor,
 *    and config entries.
 *  - Exits 0 with a summary line per topic.
 *
 * If `KAFKA_ENABLED=false`, prints a notice and exits 0 — the same script
 * runs in CI and pre-flight checks where Kafka may intentionally be off.
 */

import { Kafka, type ITopicConfig, logLevel } from "kafkajs";

import { readKafkaEnv } from "../src/env.js";
import { TOPIC_SPECS, type TopicSpec } from "../src/topics.js";

async function main(): Promise<void> {
  const env = readKafkaEnv();
  if (!env.enabled) {
    process.stdout.write("kafka:topics skipped (KAFKA_ENABLED=false)\n");
    return;
  }

  const kafka = new Kafka({
    clientId: `${env.clientId}-topic-admin`,
    brokers: [...env.brokers],
    logLevel: logLevel.WARN,
  });
  const admin = kafka.admin();

  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());

    const toCreate: ITopicConfig[] = [];
    const lines: string[] = [];

    for (const spec of TOPIC_SPECS) {
      if (existing.has(spec.name)) {
        lines.push(`  skip   ${spec.name} (already exists)`);
        continue;
      }
      toCreate.push(toKafkaTopicConfig(spec));
      lines.push(
        `  create ${spec.name} (partitions=${spec.partitions}, rf=${spec.replicationFactor})`,
      );
    }

    if (toCreate.length > 0) {
      const created = await admin.createTopics({
        topics: toCreate,
        waitForLeaders: true,
      });
      if (!created) {
        // kafkajs returns false only if all topics already existed by the time
        // the request landed (race vs. another admin). That is benign.
        lines.push("  note   broker reports topics already existed (concurrent create)");
      }
    }

    process.stdout.write(["kafka:topics ok", ...lines, ""].join("\n"));
  } finally {
    await admin.disconnect();
  }
}

function toKafkaTopicConfig(spec: TopicSpec): ITopicConfig {
  const configEntries = spec.configEntries
    ? Object.entries(spec.configEntries).map(([name, value]) => ({ name, value }))
    : undefined;
  return {
    topic: spec.name,
    numPartitions: spec.partitions,
    replicationFactor: spec.replicationFactor,
    ...(configEntries ? { configEntries } : {}),
  };
}

main().catch((error: unknown) => {
  process.stderr.write(`kafka:topics failed: ${formatError(error)}\n`);
  process.exitCode = 1;
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
