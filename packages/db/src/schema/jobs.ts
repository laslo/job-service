import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Full job lifecycle as understood by the platform. Defining all four values up
 * front keeps the Postgres enum stable across stages so Stage 5 (workers) can
 * transition rows without an ALTER TYPE migration.
 */
export const jobStatusValues = ["pending", "running", "completed", "failed"] as const;
export type JobStatus = (typeof jobStatusValues)[number];

export const jobStatus = pgEnum("job_status", jobStatusValues);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    status: jobStatus("status").notNull().default("pending"),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("jobs_status_created_at_idx").on(table.status, table.createdAt)],
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
