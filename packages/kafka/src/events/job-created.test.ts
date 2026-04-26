import { describe, expect, it } from "vitest";

import {
  decodeJobCreated,
  encodeJobCreated,
  JOB_CREATED_SCHEMA_VERSION,
  JobCreatedDecodeError,
  type JobCreatedEvent,
} from "./job-created.js";
import { Topics } from "../topics.js";

const sample: JobCreatedEvent = {
  schemaVersion: JOB_CREATED_SCHEMA_VERSION,
  id: "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b",
  type: "pdf.render",
  status: "pending",
  createdAt: "2026-04-26T20:31:11.000Z",
};

describe("encodeJobCreated", () => {
  it("targets the jobs.created topic with the job id as the key", () => {
    const encoded = encodeJobCreated(sample);
    expect(encoded.topic).toBe(Topics.JobsCreated);
    expect(encoded.key).toBe(sample.id);
    expect(encoded.headers["content-type"]).toBe("application/json");
    expect(encoded.headers["schema-version"]).toBe("1");
    expect(JSON.parse(encoded.value)).toEqual(sample);
  });
});

describe("decodeJobCreated", () => {
  it("round-trips an encoded payload", () => {
    const encoded = encodeJobCreated(sample);
    expect(decodeJobCreated(encoded.value)).toEqual(sample);
  });

  it("accepts a Buffer payload", () => {
    expect(decodeJobCreated(Buffer.from(JSON.stringify(sample)))).toEqual(sample);
  });

  it("rejects malformed JSON", () => {
    expect(() => decodeJobCreated("not-json")).toThrow(JobCreatedDecodeError);
  });

  it("rejects payloads with the wrong schema version", () => {
    const wrong = JSON.stringify({ ...sample, schemaVersion: 99 });
    expect(() => decodeJobCreated(wrong)).toThrow(JobCreatedDecodeError);
  });

  it("rejects payloads missing a required field", () => {
    const partial = JSON.stringify({ ...sample, id: undefined });
    expect(() => decodeJobCreated(partial)).toThrow(JobCreatedDecodeError);
  });
});
