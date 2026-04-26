import { describe, expect, it } from "vitest";

import { InvalidApiEnvError, readApiEnv } from "./env.js";

describe("readApiEnv", () => {
  it("uses safe defaults when no overrides are set", () => {
    expect(readApiEnv({})).toEqual({ host: "0.0.0.0", port: 4000 });
  });

  it("reads JOB_SERVICE_PORT and JOB_SERVICE_HOST", () => {
    expect(readApiEnv({ JOB_SERVICE_PORT: "5000", JOB_SERVICE_HOST: "127.0.0.1" })).toEqual({
      host: "127.0.0.1",
      port: 5000,
    });
  });

  it.each(["0", "-1", "70000", "abc", "12.5"])("rejects invalid port %s", (port) => {
    expect(() => readApiEnv({ JOB_SERVICE_PORT: port })).toThrow(InvalidApiEnvError);
  });
});
