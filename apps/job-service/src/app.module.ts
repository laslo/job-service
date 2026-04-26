import { Module } from "@nestjs/common";

import { DbModule } from "./db/db.module.js";
import { HealthController } from "./health/health.controller.js";
import { JobsModule } from "./jobs/jobs.module.js";

@Module({
  imports: [DbModule, JobsModule],
  controllers: [HealthController],
})
export class AppModule {}
