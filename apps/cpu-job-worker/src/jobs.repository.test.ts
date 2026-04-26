import { describe, expect, it, vi } from "vitest";

import type { Database, JobRow } from "@job-service/db";

import { MAX_ERROR_LENGTH, WorkerJobsRepository } from "./jobs.repository.js";

interface FakeUpdate {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
}

function makeRow(overrides: Partial<JobRow> = {}): JobRow {
  const now = new Date("2026-04-26T20:31:11.000Z");
  return {
    id: "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b",
    principalId: "principal-1",
    type: "pdf.render",
    status: "running",
    payload: {},
    error: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDb(returning: JobRow[]): { db: Database; update: FakeUpdate } {
  const update: FakeUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returning),
  };
  const db = { update: vi.fn().mockReturnValue(update) } as unknown as Database;
  return { db, update };
}

describe("WorkerJobsRepository.markRunning", () => {
  it("clears any prior error and stamps updatedAt", async () => {
    const { db, update } = makeDb([makeRow({ status: "running" })]);
    const repo = new WorkerJobsRepository(db);

    const result = await repo.markRunning("id-1");

    expect(result?.status).toBe("running");
    const setCall = update.set.mock.calls[0]?.[0];
    expect(setCall.status).toBe("running");
    expect(setCall.error).toBeNull();
    expect(setCall.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when no row matches the active-status guard", async () => {
    const { db } = makeDb([]);
    const repo = new WorkerJobsRepository(db);
    expect(await repo.markRunning("missing")).toBeNull();
  });
});

describe("WorkerJobsRepository.markCompleted", () => {
  it("transitions only running rows", async () => {
    const { db, update } = makeDb([makeRow({ status: "completed" })]);
    const repo = new WorkerJobsRepository(db);

    const result = await repo.markCompleted("id-1");

    expect(result?.status).toBe("completed");
    expect(update.set.mock.calls[0]?.[0]).toMatchObject({ status: "completed", error: null });
  });
});

describe("WorkerJobsRepository.markFailed", () => {
  it("persists the error message and bumps updatedAt", async () => {
    const { db, update } = makeDb([makeRow({ status: "failed", error: "boom" })]);
    const repo = new WorkerJobsRepository(db);

    const result = await repo.markFailed("id-1", "boom");

    expect(result?.status).toBe("failed");
    expect(update.set.mock.calls[0]?.[0]).toMatchObject({ status: "failed", error: "boom" });
  });

  it("truncates oversized error messages to keep row size bounded", async () => {
    const { db, update } = makeDb([makeRow({ status: "failed" })]);
    const repo = new WorkerJobsRepository(db);
    const long = "x".repeat(MAX_ERROR_LENGTH * 2);

    await repo.markFailed("id-1", long);

    const persisted: string = update.set.mock.calls[0]?.[0].error;
    expect(persisted.length).toBe(MAX_ERROR_LENGTH);
    expect(persisted.endsWith("…")).toBe(true);
  });
});
