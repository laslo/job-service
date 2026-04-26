import { describe, expect, it, vi } from "vitest";

import type { JobRow } from "@job-service/db";
import { JOB_CREATED_SCHEMA_VERSION, type JobCreatedEvent } from "@job-service/kafka";

import type { CpuWorkerEnv } from "./env.js";
import { handleJobCreated, type HandlerLogger } from "./handler.js";
import { JobNotFoundError, type WorkerJobsRepository } from "./jobs.repository.js";

const SAMPLE_ID = "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b";

function makeEvent(overrides: Partial<JobCreatedEvent> = {}): JobCreatedEvent {
  return {
    schemaVersion: JOB_CREATED_SCHEMA_VERSION,
    id: SAMPLE_ID,
    type: "pdf.render",
    status: "pending",
    createdAt: "2026-04-26T20:31:11.000Z",
    ...overrides,
  };
}

function makeRow(overrides: Partial<JobRow> = {}): JobRow {
  const now = new Date("2026-04-26T20:31:11.000Z");
  return {
    id: SAMPLE_ID,
    principalId: "principal-1",
    type: "pdf.render",
    status: "pending",
    payload: {},
    error: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRepo(): WorkerJobsRepository {
  return {
    findById: vi.fn(),
    markRunning: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
  } as unknown as WorkerJobsRepository;
}

function makeLogger(): HandlerLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const env: CpuWorkerEnv = {
  // Tiny iteration count so the test runs in <10ms.
  defaultIterations: 50,
  maxIterations: 100_000,
  timeoutMs: 30_000,
};

describe("handleJobCreated", () => {
  it("transitions a pending row through running → completed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValueOnce(makeRow());
    vi.mocked(repo.markRunning).mockResolvedValueOnce(makeRow({ status: "running" }));
    vi.mocked(repo.markCompleted).mockResolvedValueOnce(makeRow({ status: "completed" }));

    const outcome = await handleJobCreated(makeEvent(), {
      env,
      repository: repo,
      logger: makeLogger(),
    });

    expect(outcome.kind).toBe("completed");
    expect(repo.markRunning).toHaveBeenCalledWith(SAMPLE_ID);
    expect(repo.markCompleted).toHaveBeenCalledWith(SAMPLE_ID);
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("persists a failure with a serialised message when the stub throws", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValueOnce(
      makeRow({ payload: { iterations: -7 } as Record<string, unknown> }),
    );
    vi.mocked(repo.markRunning).mockResolvedValueOnce(
      makeRow({ status: "running", payload: { iterations: -7 } as Record<string, unknown> }),
    );
    vi.mocked(repo.markFailed).mockResolvedValueOnce(
      makeRow({ status: "failed", error: "payload.iterations must be a positive integer, got -7" }),
    );

    const outcome = await handleJobCreated(makeEvent(), {
      env,
      repository: repo,
      logger: makeLogger(),
    });

    expect(outcome.kind).toBe("failed");
    expect(repo.markCompleted).not.toHaveBeenCalled();
    expect(repo.markFailed).toHaveBeenCalledTimes(1);
    const [, message] = vi.mocked(repo.markFailed).mock.calls[0]!;
    expect(message).toMatch(/payload.iterations must be a positive integer/);
  });

  it("annotates the failure when the wall-clock budget is exceeded", async () => {
    const repo = makeRepo();
    // Use a real-looking row but force the deadline into the past via `now`.
    vi.mocked(repo.findById).mockResolvedValueOnce(makeRow({ payload: { iterations: 5_000 } }));
    vi.mocked(repo.markRunning).mockResolvedValueOnce(
      makeRow({ status: "running", payload: { iterations: 5_000 } }),
    );
    vi.mocked(repo.markFailed).mockResolvedValueOnce(
      makeRow({ status: "failed", error: "exceeded" }),
    );

    const tinyBudgetEnv: CpuWorkerEnv = { ...env, timeoutMs: 1 };
    // `now()` returns a value far in the past so deadline = now() + 1 has
    // already passed by the time the loop samples it.
    const fixedNow = (): number => Date.now() - 10_000;

    const outcome = await handleJobCreated(makeEvent(), {
      env: tinyBudgetEnv,
      repository: repo,
      logger: makeLogger(),
      now: fixedNow,
    });

    expect(outcome.kind).toBe("failed");
    const [, message] = vi.mocked(repo.markFailed).mock.calls[0]!;
    expect(message).toMatch(/JOB_CPU_TIMEOUT_MS=1/);
  });

  it("skips a row that is already in a terminal state (Kafka redelivery)", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValueOnce(makeRow({ status: "completed" }));

    const outcome = await handleJobCreated(makeEvent(), {
      env,
      repository: repo,
      logger: makeLogger(),
    });

    expect(outcome.kind).toBe("skipped");
    expect(repo.markRunning).not.toHaveBeenCalled();
    expect(repo.markCompleted).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("rethrows JobNotFoundError so the offset is not committed", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValueOnce(null);

    await expect(
      handleJobCreated(makeEvent(), { env, repository: repo, logger: makeLogger() }),
    ).rejects.toBeInstanceOf(JobNotFoundError);
  });

  it("treats a no-op markRunning as a benign skip (raced terminal transition)", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findById).mockResolvedValueOnce(makeRow());
    vi.mocked(repo.markRunning).mockResolvedValueOnce(null);

    const outcome = await handleJobCreated(makeEvent(), {
      env,
      repository: repo,
      logger: makeLogger(),
    });

    expect(outcome.kind).toBe("skipped");
    expect(repo.markCompleted).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });
});
