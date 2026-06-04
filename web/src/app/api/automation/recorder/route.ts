/**
 * Automation API — Recorder Control
 */

import { NextResponse } from 'next/server';
import { getRecorder } from '@/lib/automation/manager';
import { createAuditLog } from '@/app/actions/tenantActions';

export async function POST(req: Request) {
  try {
    const { action, url, workflowName, browserType, customerId, tenantId, actorEmail } = await req.json();
    const recorder = getRecorder();
    const actor = actorEmail || "System Operator";

    switch (action) {
      case 'start':
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        const result = await recorder.start({ url, workflowName, browserType, customerId, tenantId });
        
        // Log the recording start event
        await createAuditLog(
          actor,
          "START_RECORDING",
          workflowName || url,
          JSON.stringify({
            url,
            browser: browserType,
            tenant: tenantId || "Platform Global"
          })
        );
        
        return NextResponse.json(result);

      case 'stop':
        const currentStatus = recorder.getStatus();
        const stopResult = await recorder.stop();
        
        // Log the recording stop event
        await createAuditLog(
          actor,
          "STOP_RECORDING",
          currentStatus.workflowId || "Active Session",
          JSON.stringify({
            finalStepCount: currentStatus.stepCount,
            url: currentStatus.url
          })
        );

        return NextResponse.json(stopResult);

      case 'status':
        return NextResponse.json(recorder.getStatus());

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[API/Automation/Recorder] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const recorder = getRecorder();
  return NextResponse.json(recorder.getStatus());
}
