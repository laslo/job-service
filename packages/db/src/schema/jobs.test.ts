import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { jobStatus, jobStatusValues, jobs } from "./jobs.js";

describe("jobs schema", () => {
  it("declares the full job lifecycle as enum values", () => {
    expect(jobStatusValues).toEqual(["pending", "running", "completed", "failed"]);
    expect(jobStatus.enumName).toBe("job_status");
    expect([...jobStatus.enumValues]).toEqual([...jobStatusValues]);
  });

  it("exposes the stage-2 columns expected by API and workers", () => {
    const columns = Object.keys(jobs);
    expect(columns).toEqual(
      expect.arrayContaining(["id", "type", "status", "payload", "createdAt", "updatedAt"]),
    );
  });

  it("uses the canonical Postgres table name", () => {
    expect(getTableName(jobs)).toBe("jobs");
  });
});
