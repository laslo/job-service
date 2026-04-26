import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { JobRow } from "@job-service/db";

import type { JobEventsPublisher } from "../kafka/job-events.publisher.js";
import { JobsService, toDto } from "./jobs.service.js";
import type { JobsRepository } from "./jobs.repository.js";

function makeRow(overrides: Partial<JobRow> = {}): JobRow {
  const now = new Date("2026-04-26T20:31:11.000Z");
  return {
    id: "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b",
    type: "pdf.render",
    status: "pending",
    payload: { templateId: "invoice-v3" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRepo(): JobsRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
  } as unknown as JobsRepository;
}

function makeEvents(): JobEventsPublisher {
  return {
    publishJobCreated: vi.fn().mockResolvedValue(undefined),
  } as unknown as JobEventsPublisher;
}

describe("JobsService.create", () => {
  it("persists the input as a pending job and returns the DTO", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const row = makeRow();
    vi.mocked(repo.create).mockResolvedValueOnce(row);

    const service = new JobsService(repo, events);
    const result = await service.create({ type: "pdf.render", payload: { a: 1 } });

    expect(repo.create).toHaveBeenCalledWith({ type: "pdf.render", payload: { a: 1 } });
    expect(result).toEqual({
      id: row.id,
      type: row.type,
      status: "pending",
      payload: row.payload,
      createdAt: "2026-04-26T20:31:11.000Z",
      updatedAt: "2026-04-26T20:31:11.000Z",
    });
  });

  it("publishes a jobs.created event after the row is persisted", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const row = makeRow();
    vi.mocked(repo.create).mockResolvedValueOnce(row);

    const service = new JobsService(repo, events);
    const result = await service.create({ type: "pdf.render" });

    expect(events.publishJobCreated).toHaveBeenCalledTimes(1);
    expect(events.publishJobCreated).toHaveBeenCalledWith(result);
  });

  it("propagates publisher failures (loud-by-default contract)", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    vi.mocked(repo.create).mockResolvedValueOnce(makeRow());
    vi.mocked(events.publishJobCreated).mockRejectedValueOnce(new Error("broker down"));

    const service = new JobsService(repo, events);
    await expect(service.create({ type: "pdf.render" })).rejects.toThrow("broker down");
  });

  it("defaults a missing payload to an empty object before persisting", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    vi.mocked(repo.create).mockResolvedValueOnce(makeRow({ payload: {} }));

    const service = new JobsService(repo, events);
    await service.create({ type: "pdf.render" });

    expect(repo.create).toHaveBeenCalledWith({ type: "pdf.render", payload: {} });
  });
});

describe("JobsService.findById", () => {
  it("returns the DTO when the row exists", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const row = makeRow({ status: "running" });
    vi.mocked(repo.findById).mockResolvedValueOnce(row);

    const service = new JobsService(repo, events);
    const result = await service.findById(row.id);

    expect(result.status).toBe("running");
    expect(result.id).toBe(row.id);
  });

  it("throws a NotFoundException with the documented error code", async () => {
    const repo = makeRepo();
    const events = makeEvents();
    vi.mocked(repo.findById).mockResolvedValueOnce(null);

    const service = new JobsService(repo, events);
    await expect(service.findById("missing-id")).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { error: "job_not_found" },
    });
  });
});

describe("toDto", () => {
  it("normalizes a null payload to {} on the DTO", () => {
    const row = makeRow({ payload: null });
    expect(toDto(row).payload).toEqual({});
  });

  it("serializes timestamps as ISO strings", () => {
    const dto = toDto(makeRow());
    expect(dto.createdAt).toBe("2026-04-26T20:31:11.000Z");
    expect(dto.updatedAt).toBe("2026-04-26T20:31:11.000Z");
  });
});
