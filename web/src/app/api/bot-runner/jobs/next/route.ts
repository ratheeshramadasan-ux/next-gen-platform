import { NextRequest, NextResponse } from "next/server";
import { fetchNextBotRunnerJob } from "@/lib/services/bot-runner-portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await fetchNextBotRunnerJob({
      botHostId: body.botHostId,
      sessionId: body.sessionId ?? null,
      fingerprint: body.fingerprint,
      agentVersion: body.agentVersion,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          code: result.code,
          message: result.message,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Bot Runner next-job route failure:", error);
    return NextResponse.json(
      {
        code: "NEXT_JOB_FAILED",
        message: error?.message ?? "Bot Runner next-job fetch failed.",
      },
      { status: 500 },
    );
  }
}
