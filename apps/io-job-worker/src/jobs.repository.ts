import { and, eq, inArray } from "drizzle-orm";

import { jobs, type Database, type JobRow } from "@job-service/db";

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} not found`);
    this.name = "JobNotFoundError";
  }
}

export class WorkerJobsRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<JobRow | null> {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return row ?? null;
  }

  async markRunning(id: string): Promise<JobRow | null> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: "running", error: null, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), inArray(jobs.status, ["pending"])))
      .returning();
    return row ?? null;
  }

  async markCompleted(id: string): Promise<JobRow | null> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: "completed", error: null, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), inArray(jobs.status, ["running"])))
      .returning();
    return row ?? null;
  }

  async markFailed(id: string, error: string): Promise<JobRow | null> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: "failed", error, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), inArray(jobs.status, ["running"])))
      .returning();
    return row ?? null;
  }
}

