/**
 * Reads Kafka connection settings from process.env.
 *
 * Stage-4 scope: a comma-separated `KAFKA_BOOTSTRAP_BROKERS`, an opt-out
 * `KAFKA_ENABLED` flag, and a `KAFKA_CLIENT_ID` used both for log lines and
 * for kafkajs's per-connection identity. As with `@job-service/db/env`, we
 * deliberately avoid a runtime schema validator; a future
 * `@job-service/config` package can absorb both surfaces.
 */

export interface KafkaEnv {
  readonly enabled: boolean;
  readonly brokers: readonly string[];
  readonly clientId: string;
}

export class InvalidKafkaEnvError extends Error {
  constructor(name: string, value: unknown, reason?: string) {
    super(`Invalid env var ${name}=${String(value)}${reason ? `: ${reason}` : ""}`);
    this.name = "InvalidKafkaEnvError";
  }
}

const DEFAULT_BROKERS = "localhost:9092";
const DEFAULT_CLIENT_ID = "job-service";

export function readKafkaEnv(env: NodeJS.ProcessEnv = process.env): KafkaEnv {
  const enabled = parseBool(env.KAFKA_ENABLED, true);

  const rawBrokers = env.KAFKA_BOOTSTRAP_BROKERS?.trim() || DEFAULT_BROKERS;
  const brokers = rawBrokers
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (brokers.length === 0) {
    throw new InvalidKafkaEnvError(
      "KAFKA_BOOTSTRAP_BROKERS",
      env.KAFKA_BOOTSTRAP_BROKERS,
      "must be a non-empty comma-separated host:port list",
    );
  }
  for (const broker of brokers) {
    if (!/^[^\s:]+:\d{1,5}$/.test(broker)) {
      throw new InvalidKafkaEnvError("KAFKA_BOOTSTRAP_BROKERS", broker, "expected host:port");
    }
  }

  const clientId = env.KAFKA_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;

  return { enabled, brokers, clientId };
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  const raw = value?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }
  throw new InvalidKafkaEnvError("KAFKA_ENABLED", value);
}
