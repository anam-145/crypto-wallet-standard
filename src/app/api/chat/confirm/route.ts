import { NextRequest, NextResponse } from 'next/server';
import { agent } from '@/lib/agent/singleton';

export async function POST(req: NextRequest) {
  try {
    const { modules, history, pendingToolCall } = await req.json();

    if (!pendingToolCall || !history) {
      return NextResponse.json(
        { error: 'pendingToolCall and history are required' },
        { status: 400 },
      );
    }

    const result = await agent.executeConfirmed(
      modules || [],
      history,
      pendingToolCall,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
