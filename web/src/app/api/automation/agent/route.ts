/**
 * Automation API — Agent Control
 */

import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/automation/manager';

export async function POST(req: Request) {
  try {
    const { action, workflowId, browserType } = await req.json();
    const agent = getAgent();

    switch (action) {
      case 'run':
        if (!workflowId) return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
        // Run asynchronously
        agent.run(workflowId, browserType).catch(err => {
          console.error('[Agent] Execution error:', err);
        });
        return NextResponse.json({ success: true, message: 'Execution started' });

      case 'stop':
        await agent.stop();
        return NextResponse.json({ success: true, message: 'Execution stopped' });

      case 'status':
        return NextResponse.json(agent.getStatus());

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[API/Automation/Agent] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
