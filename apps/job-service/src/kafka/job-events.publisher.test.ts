import { describe, expect, it, vi } from "vitest";

import { Topics } from "@job-service/kafka";

import type { JobDto } from "../jobs/dto/job.dto.js";
import { JobEventsPublisher } from "./job-events.publisher.js";
import type { KafkaClient } from "./kafka.client.js";

const sampleJob: JobDto = {
  id: "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b",
  type: "pdf.render",
  status: "pending",
  payload: { templateId: "invoice-v3" },
  error: null,
  createdAt: "2026-04-26T20:31:11.000Z",
  updatedAt: "2026-04-26T20:31:11.000Z",
};

function makeKafka(opts: { enabled?: boolean; send?: ReturnType<typeof vi.fn> } = {}): {
  client: KafkaClient;
  send: ReturnType<typeof vi.fn>;
} {
  const send = opts.send ?? vi.fn().mockResolvedValue([{ topicName: Topics.JobsCreated }]);
  const enabled = opts.enabled ?? true;
  const client = {
    isEnabled: () => enabled,
    getProducer: () => ({ send }),
  } as unknown as KafkaClient;
  return { client, send };
}

describe("JobEventsPublisher", () => {
  it("sends an encoded jobs.created message keyed by the job id", async () => {
    const { client, send } = makeKafka();
    const publisher = new JobEventsPublisher(client);

    await publisher.publishJobCreated(sampleJob);

    expect(send).toHaveBeenCalledTimes(1);
    const call = send.mock.calls[0]?.[0];
    expect(call.topic).toBe(Topics.JobsCreated);
    expect(call.messages).toHaveLength(1);
    const [message] = call.messages;
    expect(message.key).toBe(sampleJob.id);
    expect(message.headers["content-type"]).toBe("application/json");
    expect(message.headers["event-type"]).toBe("job.created");
    expect(JSON.parse(message.value)).toEqual({
      schemaVersion: 1,
      id: sampleJob.id,
      type: sampleJob.type,
      status: "pending",
      createdAt: sampleJob.createdAt,
    });
  });

  it("is a no-op when KAFKA_ENABLED=false", async () => {
    const { client, send } = makeKafka({ enabled: false });
    const publisher = new JobEventsPublisher(client);

    await publisher.publishJobCreated(sampleJob);

    expect(send).not.toHaveBeenCalled();
  });

  it("rejects publishing for non-pending jobs (defensive)", async () => {
    const { client, send } = makeKafka();
    const publisher = new JobEventsPublisher(client);

    await expect(publisher.publishJobCreated({ ...sampleJob, status: "running" })).rejects.toThrow(
      /status='pending'/,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("propagates broker errors so the API surfaces a 500", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("KafkaJSConnectionError"));
    const { client } = makeKafka({ send });
    const publisher = new JobEventsPublisher(client);

    await expect(publisher.publishJobCreated(sampleJob)).rejects.toThrow("KafkaJSConnectionError");
  });
});
