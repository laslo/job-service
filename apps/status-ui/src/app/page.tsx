"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type JobDto = {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  payload: Record<string, unknown>;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeJsonParse(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export default function Page() {
  const [type, setType] = useState("pdf.render");
  const [payloadText, setPayloadText] = useState('{"example":true}');
  const [jobId, setJobId] = useState("");
  const [pollMs, setPollMs] = useState(1500);

  const [lastJob, setLastJob] = useState<JobDto | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const effectivePollMs = useMemo(() => Math.max(500, Math.min(60_000, pollMs)), [pollMs]);
  const timer = useRef<number | null>(null);

  async function createJob() {
    setIsCreating(true);
    setLastError(null);
    setLastJob(null);
    try {
      const parsed = safeJsonParse(payloadText.trim() || "{}");
      if (!parsed.ok) {
        setLastError(`payload JSON invalid: ${parsed.error}`);
        return;
      }
      if (parsed.value !== null && typeof parsed.value !== "object") {
        setLastError("payload JSON must be an object");
        return;
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: type.trim(), payload: parsed.value }),
      });

      const text = await res.text();
      if (!res.ok) {
        setLastError(text);
        return;
      }
      const created = JSON.parse(text) as JobDto;
      setJobId(created.id);
      setLastJob(created);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  }

  async function fetchJob(id: string) {
    setLastError(null);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        setLastError(text);
        setLastJob(null);
        return;
      }
      setLastJob(JSON.parse(text) as JobDto);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
      setLastJob(null);
    }
  }

  useEffect(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    const id = jobId.trim();
    if (!id) return;

    void fetchJob(id);
    timer.current = window.setInterval(() => void fetchJob(id), effectivePollMs);
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [jobId, effectivePollMs]);

  const curlExamples = useMemo(() => {
    const base = "http://localhost:4000";
    return [
      `curl -s -X POST ${base}/v1/jobs -H 'content-type: application/json' -d '{"type":"${type.trim() || "pdf.render"}","payload":{}}'`,
      jobId.trim()
        ? `curl -s ${base}/v1/jobs/${jobId.trim()} | jq`
        : `curl -s ${base}/v1/jobs/<job_id> | jq`,
    ].join("\n");
  }, [jobId, type]);

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Job status (polling)</h1>
        <div className="muted">
          This UI talks to the Next.js backend (`/api/jobs`) which proxies to the job service. Set{" "}
          <code>JOB_API_BASE_URL</code> for non-default environments.
        </div>
      </header>

      <section className="row">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <span className="label">Job type</span>
              <input value={type} onChange={(e) => setType(e.target.value)} placeholder="pdf.render" />
            </label>
            <label>
              <span className="label">Payload (JSON object)</span>
              <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => void createJob()} disabled={isCreating}>
              {isCreating ? "Creating…" : "Create job"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setJobId("");
                setLastJob(null);
                setLastError(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <span className="label">Job id</span>
              <input
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="uuid (v4)"
                spellCheck={false}
              />
            </label>
            <label>
              <span className="label">Polling interval (ms)</span>
              <input
                type="number"
                min={500}
                max={60000}
                value={pollMs}
                onChange={(e) => setPollMs(Number(e.target.value))}
              />
              <div className="muted">Effective: {effectivePollMs}ms (clamped to 500–60000)</div>
            </label>
          </div>

          {lastError ? (
            <div>
              <div className="label">Error</div>
              <div className="error">{lastError}</div>
            </div>
          ) : null}

          {lastJob ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="kv">
                <div>id</div>
                <div style={{ wordBreak: "break-all" }}>{lastJob.id}</div>
                <div>type</div>
                <div>{lastJob.type}</div>
                <div>status</div>
                <div>
                  <strong>{lastJob.status}</strong>
                </div>
                <div>createdAt</div>
                <div>{lastJob.createdAt}</div>
                <div>updatedAt</div>
                <div>{lastJob.updatedAt}</div>
                <div>error</div>
                <div>{lastJob.error ?? <span className="muted">null</span>}</div>
              </div>
              <div>
                <div className="label">payload</div>
                <pre className="code">{JSON.stringify(lastJob.payload, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="muted">
              {jobId.trim()
                ? "Waiting for the next poll…"
                : "Create a job or paste an id to start polling."}
            </div>
          )}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Console reproduction</div>
            <div className="muted">Same flow without opening the UI.</div>
          </div>
        </div>
        <pre className="code">{curlExamples}</pre>
      </section>
    </main>
  );
}

