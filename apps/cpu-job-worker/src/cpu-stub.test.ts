import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CpuStubTimeoutError, readIterationsOverride, runCpuStub } from "./cpu-stub.js";

function expectedHash(seed: string, iterations: number): string {
  let digest: Buffer = Buffer.from(seed, "utf8");
  for (let i = 0; i < iterations; i++) {
    digest = createHash("sha256").update(digest).digest();
  }
  return digest.toString("hex");
}

describe("runCpuStub", () => {
  it("produces a deterministic hash for the same seed and iteration count", () => {
    const seed = "6f1c5b6a-4f8a-4a0d-9f1d-2a72b3a4f01b";
    const iterations = 100;
    const result = runCpuStub({ seed, iterations, deadline: Date.now() + 10_000 });
    expect(result.hash).toBe(expectedHash(seed, iterations));
    expect(result.iterations).toBe(iterations);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("aborts with CpuStubTimeoutError once the deadline is reached", () => {
    expect(() =>
      runCpuStub({
        seed: "cancel-me",
        iterations: 1_000_000,
        // Deadline already in the past forces an immediate abort on the first
        // sample (after one DEADLINE_CHECK_INTERVAL block of work).
        deadline: Date.now() - 1,
      }),
    ).toThrow(CpuStubTimeoutError);
  });

  it("rejects non-positive iteration counts up front", () => {
    expect(() => runCpuStub({ seed: "x", iterations: 0, deadline: Date.now() + 100 })).toThrow();
    expect(() => runCpuStub({ seed: "x", iterations: -1, deadline: Date.now() + 100 })).toThrow();
  });
});

describe("readIterationsOverride", () => {
  it("returns null when the payload omits the field", () => {
    expect(readIterationsOverride({}, 1000)).toBeNull();
    expect(readIterationsOverride(undefined, 1000)).toBeNull();
    expect(readIterationsOverride(null, 1000)).toBeNull();
  });

  it("accepts an in-range positive integer", () => {
    expect(readIterationsOverride({ iterations: 250 }, 1000)).toBe(250);
  });

  it("rejects non-integer or non-positive overrides", () => {
    expect(() => readIterationsOverride({ iterations: 1.5 }, 1000)).toThrow();
    expect(() => readIterationsOverride({ iterations: 0 }, 1000)).toThrow();
    expect(() => readIterationsOverride({ iterations: "many" }, 1000)).toThrow();
  });

  it("rejects overrides above the configured ceiling", () => {
    expect(() => readIterationsOverride({ iterations: 5000 }, 1000)).toThrow(
      /JOB_CPU_MAX_ITERATIONS=1000/,
    );
  });
});
