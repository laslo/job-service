import { describe, expect, it } from "vitest";

import { InvalidKafkaEnvError, readKafkaEnv } from "./env.js";

describe("readKafkaEnv", () => {
  it("uses safe defaults when no overrides are set", () => {
    expect(readKafkaEnv({})).toEqual({
      enabled: true,
      brokers: ["localhost:9092"],
      clientId: "job-service",
    });
  });

  it("parses a comma-separated broker list", () => {
    const env = readKafkaEnv({
      KAFKA_BOOTSTRAP_BROKERS: "broker-a:9092, broker-b:9092 ,broker-c:9092",
    });
    expect(env.brokers).toEqual(["broker-a:9092", "broker-b:9092", "broker-c:9092"]);
  });

  it.each([["false"], ["0"], ["off"], ["NO"]])("treats %s as disabled", (value) => {
    expect(readKafkaEnv({ KAFKA_ENABLED: value }).enabled).toBe(false);
  });

  it.each([["true"], ["1"], ["on"], ["YES"]])("treats %s as enabled", (value) => {
    expect(readKafkaEnv({ KAFKA_ENABLED: value }).enabled).toBe(true);
  });

  it("rejects bogus boolean values", () => {
    expect(() => readKafkaEnv({ KAFKA_ENABLED: "maybe" })).toThrow(InvalidKafkaEnvError);
  });

  it.each([["localhost"], ["localhost:abc"], [":9092"]])(
    "rejects malformed broker %s",
    (broker) => {
      expect(() => readKafkaEnv({ KAFKA_BOOTSTRAP_BROKERS: broker })).toThrow(InvalidKafkaEnvError);
    },
  );

  it("falls back to default brokers when KAFKA_BOOTSTRAP_BROKERS is empty", () => {
    expect(readKafkaEnv({ KAFKA_BOOTSTRAP_BROKERS: "" }).brokers).toEqual(["localhost:9092"]);
  });

  it("uses the explicit client id when provided", () => {
    expect(readKafkaEnv({ KAFKA_CLIENT_ID: "events-logger" }).clientId).toBe("events-logger");
  });
});
