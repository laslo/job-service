import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { createProducer, type Producer, readKafkaEnv } from "@job-service/kafka";

/**
 * NestJS-managed wrapper around a single shared kafkajs `Producer`.
 *
 * Lifecycle:
 *  - Constructed eagerly. If `KAFKA_ENABLED=false`, the producer is left
 *    null and `getProducer()` throws — call `isEnabled()` first.
 *  - Connects in `onModuleInit` so the API fails fast when the broker is
 *    misconfigured (rather than discovering it on the first POST /v1/jobs).
 *  - Disconnects cleanly on shutdown so dev / k8s rollouts drain in flight
 *    sends. Nest invokes this when `enableShutdownHooks()` is set in `main.ts`.
 */
@Injectable()
export class KafkaClient implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaClient.name);
  private readonly enabled: boolean;
  private producer: Producer | null = null;
  private connected = false;

  constructor() {
    const env = readKafkaEnv();
    this.enabled = env.enabled;
    if (this.enabled) {
      this.producer = createProducer({ env });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.producer) {
      this.logger.warn("Kafka is disabled (KAFKA_ENABLED=false); job events will not be produced.");
      return;
    }
    await this.producer.connect();
    this.connected = true;
    this.logger.log("Kafka producer connected");
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this.producer || !this.connected) {
      return;
    }
    this.logger.log(`Closing Kafka producer${signal ? ` (signal=${signal})` : ""}`);
    await this.producer.disconnect();
    this.connected = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProducer(): Producer {
    if (!this.producer) {
      throw new Error(
        "Kafka producer is unavailable (KAFKA_ENABLED=false). Guard with KafkaClient.isEnabled() before calling.",
      );
    }
    return this.producer;
  }
}
