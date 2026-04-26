import { Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";

import { jobs, type JobRow, type NewJobRow } from "@job-service/db";

import { JobServiceDbClient } from "../db/db.client.js";

/**
 * Thin Drizzle adapter for the `jobs` table.
 *
 * Kept separate from `JobsService` so business rules can be unit-tested with a
 * mock repository (no Postgres needed) and so future stages — caching, soft
 * deletes, projections — have a single place to evolve without touching the
 * controller surface.
 */
@Injectable()
export class JobsRepository {
  constructor(private readonly db: JobServiceDbClient) {}

  async create(input: NewJobRow): Promise<JobRow> {
    const [row] = await this.db.client.db.insert(jobs).values(input).returning();
    if (!row) {
      throw new Error("Insert into jobs returned no row");
    }
    return row;
  }

  async findByIdForPrincipal(principalId: string, id: string): Promise<JobRow | null> {
    const [row] = await this.db.client.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.principalId, principalId)))
      .limit(1);
    return row ?? null;
  }

  async countActiveByPrincipal(principalId: string): Promise<number> {
    const [row] = await this.db.client.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.principalId, principalId), inArray(jobs.status, ["pending", "running"])))
      .limit(1);
    return Number(row?.count ?? 0);
  }
}
