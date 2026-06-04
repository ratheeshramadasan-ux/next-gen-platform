/**
 * Automation API — Real-time Event Stream (SSE)
 */

import { NextResponse } from 'next/server';
import { eventList } from '@/lib/automation/manager';

export async function GET() {
  const encoder = new TextEncoder();
  let lastEventIndex = eventList.length; // Start with fresh events only? Or last few?
  
  // Actually, for a dashboard, we might want the last few events if they just joined
  // But let's stick to a clean stream.
  
  let interval: ReturnType<typeof setInterval>;
  let keepAlive: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeSend = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // Controller already closed — clean up
          closed = true;
          clearInterval(interval);
          clearInterval(keepAlive);
        }
      };

      // Periodic check for new events
      interval = setInterval(() => {
        if (eventList.length > lastEventIndex) {
          const newEvents = eventList.slice(lastEventIndex);
          newEvents.forEach(e =>
            safeSend(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
          );
          lastEventIndex = eventList.length;
        }
      }, 200);

      // Keep-alive
      keepAlive = setInterval(() => {
        safeSend(encoder.encode(': keep-alive\n\n'));
      }, 30000);
    },
    cancel() {
      closed = true;
      clearInterval(interval);
      clearInterval(keepAlive);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
