import { describe, expect, it } from "vitest";

import { InvalidCpuWorkerEnvError, readCpuWorkerEnv } from "./env.js";

describe("readCpuWorkerEnv", () => {
  it("uses safe defaults when no overrides are set", () => {
    expect(readCpuWorkerEnv({})).toEqual({
      timeoutMs: 30_000,
      defaultIterations: 200_000,
      maxIterations: 5_000_000,
    });
  });

  it("accepts explicit overrides for all three knobs", () => {
    const env = readCpuWorkerEnv({
      JOB_CPU_TIMEOUT_MS: "1000",
      JOB_CPU_DEFAULT_ITERATIONS: "10",
      JOB_CPU_MAX_ITERATIONS: "20",
    });
    expect(env).toEqual({ timeoutMs: 1000, defaultIterations: 10, maxIterations: 20 });
  });

  it("rejects non-numeric values", () => {
    expect(() => readCpuWorkerEnv({ JOB_CPU_TIMEOUT_MS: "fast" })).toThrow(
      InvalidCpuWorkerEnvError,
    );
  });

  it("rejects timeouts below the floor", () => {
    expect(() => readCpuWorkerEnv({ JOB_CPU_TIMEOUT_MS: "0" })).toThrow(InvalidCpuWorkerEnvError);
  });

  it("rejects max-iterations below the configured default", () => {
    expect(() =>
      readCpuWorkerEnv({
        JOB_CPU_DEFAULT_ITERATIONS: "100",
        JOB_CPU_MAX_ITERATIONS: "50",
      }),
    ).toThrow(InvalidCpuWorkerEnvError);
  });
});
