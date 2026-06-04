import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const upstreamUrl =
    process.env.ORCHESTRATOR_API_URL ?? "http://localhost:3001/run-intent";

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });

  const responseText = await upstreamResponse.text();

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

