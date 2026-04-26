import { NextResponse } from "next/server";

function apiBaseUrl(): string {
  return process.env.JOB_API_BASE_URL?.trim() || "http://localhost:4000";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const authorization = req.headers.get("authorization") ?? undefined;
  const res = await fetch(`${apiBaseUrl()}/v1/jobs/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { accept: "application/json", ...(authorization ? { authorization } : {}) },
    cache: "no-store",
  });

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
