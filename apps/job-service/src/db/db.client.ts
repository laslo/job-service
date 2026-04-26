import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";

import { createClient, type DbClient } from "@job-service/db";

/**
 * NestJS-managed wrapper around the Drizzle client from `@job-service/db`.
 *
 * Lifecycle:
 *  - The pool is opened lazily on first construction (i.e. at app bootstrap).
 *  - `onApplicationShutdown` closes connections so pkill/SIGTERM in dev or k8s
 *    drain cleanly. Nest invokes this when `enableShutdownHooks()` is set in
 *    `main.ts`.
 */
@Injectable()
export class JobServiceDbClient implements OnApplicationShutdown {
  private readonly logger = new Logger(JobServiceDbClient.name);
  readonly client: DbClient;

  constructor() {
    this.client = createClient();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Closing database client${signal ? ` (signal=${signal})` : ""}`);
    await this.client.close();
  }
}
