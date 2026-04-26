import { Module } from "@nestjs/common";

import { DbModule } from "./db/db.module.js";
import { HealthController } from "./health/health.controller.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { KafkaModule } from "./kafka/kafka.module.js";

@Module({
  imports: [DbModule, KafkaModule, JobsModule],
  controllers: [HealthController],
})
export class AppModule {}
