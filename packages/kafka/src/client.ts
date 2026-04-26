import {
  type Consumer,
  type ConsumerConfig,
  Kafka,
  Partitioners,
  type Producer,
  logLevel,
} from "kafkajs";

import { readKafkaEnv, type KafkaEnv } from "./env.js";

export interface CreateKafkaOptions {
  /** Override env-derived settings (handy for tests and one-off scripts). */
  readonly env?: KafkaEnv;
  /**
   * kafkajs log level. Defaults to WARN — INFO is very chatty during normal
   * operation. Override per-process via `KAFKAJS_LOG_LEVEL` if needed.
   */
  readonly logLevel?: logLevel;
}

/**
 * Construct a kafkajs `Kafka` client wired to the workspace env.
 *
 * Throws if `KAFKA_ENABLED=false` — callers that support the disabled mode
 * must check `readKafkaEnv().enabled` first and skip Kafka entirely. This
 * prevents accidental `localhost:9092` connection attempts when the broker
 * is intentionally turned off.
 */
export function createKafka(options: CreateKafkaOptions = {}): Kafka {
  const env = options.env ?? readKafkaEnv();
  if (!env.enabled) {
    throw new Error(
      "Kafka is disabled (KAFKA_ENABLED=false). Check readKafkaEnv().enabled before calling createKafka().",
    );
  }
  return new Kafka({
    clientId: env.clientId,
    brokers: [...env.brokers],
    logLevel: options.logLevel ?? resolveLogLevel(),
    retry: {
      initialRetryTime: 200,
      retries: 6,
    },
  });
}

export interface CreateConsumerOptions extends CreateKafkaOptions {
  readonly groupId: string;
  /** Forwarded to kafkajs; falls back to safe defaults below. */
  readonly config?: Omit<ConsumerConfig, "groupId">;
}

/**
 * Construct a configured kafkajs Consumer.
 *
 * Default semantics:
 *  - `sessionTimeout: 30_000` (kafkajs default).
 *  - `eachMessage` mode: kafkajs commits the offset *after* the handler
 *    returns successfully, so a crash mid-handler causes the message to be
 *    redelivered rather than skipped.
 */
export function createConsumer(options: CreateConsumerOptions): Consumer {
  const kafka = createKafka(options);
  return kafka.consumer({
    groupId: options.groupId,
    allowAutoTopicCreation: false,
    ...options.config,
  });
}

export function createProducer(options: CreateKafkaOptions = {}): Producer {
  const kafka = createKafka(options);
  return kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: false,
    // Explicit opt-in to the kafkajs v2 default; silences the noisy migration
    // warning at startup. The new partitioner uses murmur2, which matches the
    // Java client's default and is the right choice for a greenfield service.
    createPartitioner: Partitioners.DefaultPartitioner,
  });
}

function resolveLogLevel(): logLevel {
  const raw = process.env.KAFKAJS_LOG_LEVEL?.trim().toUpperCase();
  switch (raw) {
    case "NOTHING":
      return logLevel.NOTHING;
    case "ERROR":
      return logLevel.ERROR;
    case "WARN":
      return logLevel.WARN;
    case "INFO":
      return logLevel.INFO;
    case "DEBUG":
      return logLevel.DEBUG;
    default:
      return logLevel.WARN;
  }
}

export { logLevel } from "kafkajs";
export type { Consumer, EachMessagePayload, Kafka, Producer } from "kafkajs";
