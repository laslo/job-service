import { Global, Module } from "@nestjs/common";

import { JobEventsPublisher } from "./job-events.publisher.js";
import { KafkaClient } from "./kafka.client.js";

@Global()
@Module({
  providers: [KafkaClient, JobEventsPublisher],
  exports: [KafkaClient, JobEventsPublisher],
})
export class KafkaModule {}
