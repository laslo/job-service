import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { readDbEnv } from "./env.js";
import * as schema from "./schema/index.js";

export type Schema = typeof schema;
export type Database = PostgresJsDatabase<Schema>;

export interface CreateClientOptions {
  /**
   * Postgres connection string. Defaults to `DATABASE_URL` from process.env.
   */
  readonly url?: string;
  /**
   * Connection pool size. Scripts and migrations override this to keep the
   * footprint small; long-running services can take the postgres-js default.
   */
  readonly max?: number;
  /**
   * If true, attaches the schema for typed query helpers (`db.query.jobs`).
   * Defaults to true; flip off only for ad-hoc raw-SQL clients.
   */
  readonly withSchema?: boolean;
}

export interface DbClient {
  readonly db: Database;
  readonly sql: Sql;
  close(): Promise<void>;
}

export function createClient(options: CreateClientOptions = {}): DbClient {
  const url = options.url ?? readDbEnv().url;
  const sql = postgres(url, {
    max: options.max,
    prepare: false,
  });
  const db = drizzle(sql, {
    schema: options.withSchema === false ? undefined : schema,
  }) as Database;

  return {
    db,
    sql,
    close: () => sql.end({ timeout: 5 }),
  };
}
