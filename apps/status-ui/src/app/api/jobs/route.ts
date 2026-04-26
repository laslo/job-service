import { NextResponse } from "next/server";

function apiBaseUrl(): string {
  return process.env.JOB_API_BASE_URL?.trim() || "http://localhost:4000";
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  const authorization = req.headers.get("authorization") ?? undefined;
  const res = await fetch(`${apiBaseUrl()}/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
    body,
  });

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
