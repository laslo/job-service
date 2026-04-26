import nodemailer from "nodemailer";

import type { JobCreatedEvent } from "@job-service/kafka";

import type { IoWorkerEnv } from "./env.js";
import { JobNotFoundError, type WorkerJobsRepository } from "./jobs.repository.js";

export interface HandlerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface EmailPayload {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

function parseEmailPayload(payload: unknown): EmailPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("payload must be an object");
  }
  const p = payload as Record<string, unknown>;
  const to = p.to;
  const subject = p.subject;
  const text = p.text;
  if (typeof to !== "string" || to.trim() === "") throw new Error("payload.to must be a non-empty string");
  if (typeof subject !== "string" || subject.trim() === "")
    throw new Error("payload.subject must be a non-empty string");
  if (typeof text !== "string" || text.trim() === "") throw new Error("payload.text must be a non-empty string");
  return { to, subject, text };
}

export async function handleJobCreated(
  event: JobCreatedEvent,
  opts: { env: IoWorkerEnv; repository: WorkerJobsRepository; logger: HandlerLogger },
): Promise<{ kind: "completed" | "failed" | "skipped" }> {
  const row = await opts.repository.findById(event.id);
  if (!row) throw new JobNotFoundError(event.id);

  if (row.status === "completed" || row.status === "failed") {
    opts.logger.info(`io-worker: jobId=${row.id} already terminal (${row.status}); skipping`);
    return { kind: "skipped" };
  }

  const running = await opts.repository.markRunning(row.id);
  if (!running) {
    opts.logger.info(`io-worker: jobId=${row.id} raced to non-pending; skipping`);
    return { kind: "skipped" };
  }

  try {
    const email = parseEmailPayload(running.payload);
    const transport = nodemailer.createTransport({
      host: opts.env.smtpHost,
      port: opts.env.smtpPort,
      secure: false,
    });
    await transport.sendMail({
      from: opts.env.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    await opts.repository.markCompleted(running.id);
    opts.logger.info(`io-worker: jobId=${running.id} email sent to=${email.to}`);
    return { kind: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await opts.repository.markFailed(running.id, message);
    opts.logger.error(`io-worker: jobId=${running.id} failed: ${message}`);
    return { kind: "failed" };
  }
}

